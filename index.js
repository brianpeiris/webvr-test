var VR_POSITION_SCALE = 25;

function printVector(values) {
  var str = "[";

  str += values.x.toFixed(2) + ", ";
  str += values.y.toFixed(2) + ", ";
  str += values.z.toFixed(2);

  if ("w" in values) {
    str += ", " + values.w.toFixed(2);
  }

  str += "]";
  return str;
}

var deviceManager = new DeviceManager();
deviceManager.onResizeFOV = function (renderTargetSize) {
    if (renderTargetSize) {
        document.getElementById("renderTarget").innerHTML = (
            renderTargetSize.width + "x" + renderTargetSize.height);
    }
};
var vrMode = false;

var cameraLeft = new THREE.PerspectiveCamera( 75, 4/3, 0.1, 1000 );
var cameraRight = new THREE.PerspectiveCamera( 75, 4/3, 0.1, 1000 );

deviceManager.onHMDDeviceFound = function (hmdDevice) {
  var eyeOffsetLeft = hmdDevice.getEyeTranslation("left");
  var eyeOffsetRight = hmdDevice.getEyeTranslation("right")

  document.getElementById("leftTranslation").innerHTML = printVector(eyeOffsetLeft);
  document.getElementById("rightTranslation").innerHTML = printVector(eyeOffsetRight);

  cameraLeft.position.sub(eyeOffsetLeft);
  cameraLeft.position.z = 12;

  cameraRight.position.sub(eyeOffsetRight);
  cameraRight.position.z = 12;
};

deviceManager.onSensorDeviceFound = function (sensorDevice) {
  document.getElementById("hardwareUnitId").innerHTML = sensorDevice.hardwareUnitId;
  document.getElementById("deviceId").innerHTML = sensorDevice.deviceId;
  document.getElementById("deviceName").innerHTML = sensorDevice.deviceName;
};

var stats = document.getElementById("stats");
deviceManager.onError = function () {
  stats.classList.add("error");
  stats.innerHTML = "WebVR API not supported";
}
deviceManager.init();

window.addEventListener("keydown", function(ev) {
  if (deviceManager.hmdDevice) {
    if (ev.keyCode == "R".charCodeAt(0))  {
      deviceManager.sensorDevice.resetSensor();
    }
    if (ev.keyCode == 187 || ev.keyCode == 61)  { // "+" key
      deviceManager.deviceManager.resizeFOV(0.1);
    }
    if (ev.keyCode == 189 || ev.keyCode == 173)  { // "-" key
      deviceManager.deviceManager.resizeFOV(-0.1);
    }
  }
});

//
// Rendering
//
var renderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true });
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

renderer.setClearColor(0x202020, 1.0);

var ambient = new THREE.AmbientLight( 0x444444 );
scene.add( ambient );

var directionalLight = new THREE.DirectionalLight( 0xffeedd );
directionalLight.position.set( 0, 0, 1 ).normalize();
scene.add( directionalLight );

var riftDiffuse = THREE.ImageUtils.loadTexture( "media/maps/diffuse/DK2diffuse.jpg" );
riftDiffuse.anisotropy = 16;

var riftNormal = THREE.ImageUtils.loadTexture( "media/maps/normal/DK2normal.jpg" );
riftNormal.anisotropy = 16;

var riftMaterial = new THREE.MeshPhongMaterial( {
  map: riftDiffuse,
  normalMap: riftNormal
} );

var riftObj = new THREE.Object3D();
scene.add(riftObj);

var rift = null;
var loader = new THREE.OBJLoader();
  loader.load( 'media/models/3dDK2_nostrap.obj', function ( object ) {
    rift = object;

    object.traverse( function ( child ) {
      if ( child instanceof THREE.Mesh ) {
        child.material = riftMaterial;
      }
    } );

    rift.position.z = -3.0;
    rift.rotation.y = 3.14159;

    riftObj.add( rift );
} );

camera.position.z = 12;

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
}
resize();
window.addEventListener("resize", resize, false);

// Fullscreen VR mode handling

function onFullscreenChange() {
  if(!document.webkitFullscreenElement && !document.mozFullScreenElement) {
    vrMode = false;
  }
  resize();
}

document.addEventListener("webkitfullscreenchange", onFullscreenChange, false);
document.addEventListener("mozfullscreenchange", onFullscreenChange, false);

var vrBtn = document.getElementById("vrBtn");
if (vrBtn) {
  vrBtn.addEventListener("click", function() {
    vrMode = true;
    if (renderer.domElement.webkitRequestFullscreen) {
      renderer.domElement.webkitRequestFullscreen({
        vrDisplay: deviceManager.hmdDevice });
    } else if (renderer.domElement.mozRequestFullScreen) {
      renderer.domElement.mozRequestFullScreen({
        vrDisplay: deviceManager.hmdDevice });
    }
  }, false);
}

//
// Update Loop
//

var timestamp = document.getElementById("timestamp");
var orientation = document.getElementById("orientation");
var position = document.getElementById("position");
var angularVelocity = document.getElementById("angularVelocity");
var linearVelocity = document.getElementById("linearVelocity");
var angularAcceleration = document.getElementById("angularAcceleration");
var linearAcceleration = document.getElementById("linearAcceleration");

function updateVRDevice() {
  if (!deviceManager.sensorDevice) return false;
  var vrState = deviceManager.sensorDevice.getState();

  timestamp.innerHTML = vrState.timeStamp.toFixed(2);
  orientation.innerHTML = printVector(vrState.orientation);
  position.innerHTML = printVector(vrState.position);
  angularVelocity.innerHTML = printVector(vrState.angularVelocity);
  linearVelocity.innerHTML = printVector(vrState.linearVelocity);
  angularAcceleration.innerHTML = printVector(vrState.angularAcceleration);
  linearAcceleration.innerHTML = printVector(vrState.linearAcceleration);

  if (riftObj) {
    riftObj.position.x = vrState.position.x * VR_POSITION_SCALE;
    riftObj.position.y = vrState.position.y * VR_POSITION_SCALE;
    riftObj.position.z = vrState.position.z * VR_POSITION_SCALE;

    riftObj.quaternion.x = vrState.orientation.x;
    riftObj.quaternion.y = vrState.orientation.y;
    riftObj.quaternion.z = vrState.orientation.z;
    riftObj.quaternion.w = vrState.orientation.w;
  }

  return true;
}

function render(t) {
  requestAnimationFrame(render);

  if (!updateVRDevice() && rift) {
    // If we don't have a VR device just spin the model around to give us
    // something pretty to look at.
    rift.rotation.y += 0.01;
  }

  if (vrMode) {
    // Render left eye
    renderer.enableScissorTest ( true );
    renderer.setScissor( 0, 0, window.innerWidth / 2, window.innerHeight );
    renderer.setViewport( 0, 0, window.innerWidth / 2, window.innerHeight );
    renderer.render(scene, cameraLeft);

    // Render right eye
    renderer.setScissor( window.innerWidth / 2, 0, window.innerWidth / 2, window.innerHeight );
    renderer.setViewport( window.innerWidth / 2, 0, window.innerWidth / 2, window.innerHeight );
    renderer.render(scene, cameraRight);
  } else {
    // Render mono view
    renderer.enableScissorTest ( false );
    renderer.setViewport( 0, 0, window.innerWidth, window.innerHeight );
    renderer.render(scene, camera);
  }
}
document.body.appendChild( renderer.domElement );
render();
