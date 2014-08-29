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

//
// WebVR Device initialization
//
var sensorDevice = null;
var hmdDevice = null;
var vrMode = false;
var stats = document.getElementById("stats");

function PerspectiveMatrixFromVRFieldOfView(fov, zNear, zFar) {
  var outMat = new THREE.Matrix4();
  var out = outMat.elements;
  var upTan = Math.tan(fov.upDegrees * Math.PI/180.0);
  var downTan = Math.tan(fov.downDegrees * Math.PI/180.0);
  var leftTan = Math.tan(fov.leftDegrees * Math.PI/180.0);
  var rightTan = Math.tan(fov.rightDegrees * Math.PI/180.0);

  var xScale = 2.0 / (leftTan + rightTan);
  var yScale = 2.0 / (upTan + downTan);

  out[0] = xScale;
  out[4] = 0.0;
  out[8] = -((leftTan - rightTan) * xScale * 0.5);
  out[12] = 0.0;

  out[1] = 0.0;
  out[5] = yScale;
  out[9] = ((upTan - downTan) * yScale * 0.5);
  out[13] = 0.0;

  out[2] = 0.0;
  out[6] = 0.0;
  out[10] = zFar / (zNear - zFar);
  out[14] = (zFar * zNear) / (zNear - zFar);

  out[3] = 0.0;
  out[7] = 0.0;
  out[11] = -1.0;
  out[15] = 0.0;

  return outMat;
}

var cameraLeft = new THREE.PerspectiveCamera( 75, 4/3, 0.1, 1000 );
var cameraRight = new THREE.PerspectiveCamera( 75, 4/3, 0.1, 1000 );

var fovScale = 1.0;
function resizeFOV(amount) {
  var fovLeft, fovRight;

  if (!hmdDevice) { return; }

  if (amount != 0 && 'setFieldOfView' in hmdDevice) {
    fovScale += amount;
    if (fovScale < 0.1) { fovScale = 0.1; }

    fovLeft = hmdDevice.getRecommendedEyeFieldOfView("left");
    fovRight = hmdDevice.getRecommendedEyeFieldOfView("right");

    fovLeft.upDegrees *= fovScale;
    fovLeft.downDegrees *= fovScale;
    fovLeft.leftDegrees *= fovScale;
    fovLeft.rightDegrees *= fovScale;

    fovRight.upDegrees *= fovScale;
    fovRight.downDegrees *= fovScale;
    fovRight.leftDegrees *= fovScale;
    fovRight.rightDegrees *= fovScale;

    hmdDevice.setFieldOfView(fovLeft, fovRight);
  }

  if ('getRecommendedRenderTargetSize' in hmdDevice) {
    var renderTargetSize = hmdDevice.getRecommendedRenderTargetSize();
    document.getElementById("renderTarget").innerHTML = renderTargetSize.width + "x" + renderTargetSize.height;
  }

  if ('getCurrentEyeFieldOfView' in hmdDevice) {
    fovLeft = hmdDevice.getCurrentEyeFieldOfView("left");
    fovRight = hmdDevice.getCurrentEyeFieldOfView("right");
  } else {
    fovLeft = hmdDevice.getRecommendedEyeFieldOfView("left");
    fovRight = hmdDevice.getRecommendedEyeFieldOfView("right");
  }

  cameraLeft.projectionMatrix = PerspectiveMatrixFromVRFieldOfView(fovLeft, 0.1, 1000);
  cameraRight.projectionMatrix = PerspectiveMatrixFromVRFieldOfView(fovRight, 0.1, 1000);
}

function EnumerateVRDevices(devices) {
  // First find an HMD device
  for (var i = 0; i < devices.length; ++i) {
    if (devices[i] instanceof HMDVRDevice) {
      hmdDevice = devices[i];

      var eyeOffsetLeft = hmdDevice.getEyeTranslation("left");
      var eyeOffsetRight = hmdDevice.getEyeTranslation("right")
      document.getElementById("leftTranslation").innerHTML = printVector(eyeOffsetLeft);
      document.getElementById("rightTranslation").innerHTML = printVector(eyeOffsetRight);

      cameraLeft.position.sub(eyeOffsetLeft);
      cameraLeft.position.z = 12;

      cameraRight.position.sub(eyeOffsetRight);
      cameraRight.position.z = 12;

      resizeFOV(0.0);
    }
  }

  // Next find a sensor that matches the HMD hardwareUnitId
  for (var i = 0; i < devices.length; ++i) {
    if (devices[i] instanceof PositionSensorVRDevice &&
          (!hmdDevice || devices[i].hardwareUnitId == hmdDevice.hardwareUnitId)) {
      sensorDevice = devices[i];
      document.getElementById("hardwareUnitId").innerHTML = sensorDevice.hardwareUnitId;
      document.getElementById("deviceId").innerHTML = sensorDevice.deviceId;
      document.getElementById("deviceName").innerHTML = sensorDevice.deviceName;
    }
  }
}

if (navigator.getVRDevices) {
  navigator.getVRDevices().then(EnumerateVRDevices);
} else if (navigator.mozGetVRDevices) {
  navigator.mozGetVRDevices(EnumerateVRDevices);
} else {
  stats.classList.add("error");
  stats.innerHTML = "WebVR API not supported";
}

window.addEventListener("keydown", function(ev) {
  if (hmdDevice) {
    if (ev.keyCode == "R".charCodeAt(0))  {
      sensorDevice.resetSensor();
    }
    if (ev.keyCode == 187 || ev.keyCode == 61)  { // "+" key
      resizeFOV(0.1);
    }
    if (ev.keyCode == 189 || ev.keyCode == 173)  { // "-" key
      resizeFOV(-0.1);
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
      renderer.domElement.webkitRequestFullscreen({ vrDisplay: hmdDevice });
    } else if (renderer.domElement.mozRequestFullScreen) {
      renderer.domElement.mozRequestFullScreen({ vrDisplay: hmdDevice });
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
  if (!sensorDevice) return false;
  var vrState = sensorDevice.getState();

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
