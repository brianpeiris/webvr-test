(function () {
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
  deviceManager.onResizeFOV = function (
    renderTargetSize, leftProjectionMatrix, rightProjectionMatrix
  ) {
    if (renderTargetSize) {
      document.getElementById("renderTarget").innerHTML = (
        renderTargetSize.width + "x" + renderTargetSize.height);
    }
    renderer.setProjectionMatrices(leftProjectionMatrix, rightProjectionMatrix);
  };

  var renderer = new Renderer();

  deviceManager.onHMDDeviceFound = function (hmdDevice) {
    var eyeOffsetLeft = hmdDevice.getEyeTranslation("left");
    var eyeOffsetRight = hmdDevice.getEyeTranslation("right")

    document.getElementById("leftTranslation").innerHTML = printVector(
      eyeOffsetLeft);
    document.getElementById("rightTranslation").innerHTML = printVector(
      eyeOffsetRight);

    renderer.setCameraOffsets(eyeOffsetLeft, eyeOffsetRight);
  };

  deviceManager.onSensorDeviceFound = function (sensorDevice) {
    document.getElementById("hardwareUnitId").innerHTML = (
      sensorDevice.hardwareUnitId);
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
        deviceManager.resizeFOV(0.1);
      }
      if (ev.keyCode == 189 || ev.keyCode == 173)  { // "-" key
        deviceManager.resizeFOV(-0.1);
      }
    }
  });

  renderer.resize();
  window.addEventListener("resize", renderer.resize.bind(renderer), false);

  // Fullscreen VR mode handling

  function onFullscreenChange() {
    if(!document.webkitFullscreenElement && !document.mozFullScreenElement) {
      renderer.vrMode = false;
    }
    renderer.resize();
  }

  document.addEventListener("webkitfullscreenchange", onFullscreenChange, false);
  document.addEventListener("mozfullscreenchange", onFullscreenChange, false);

  var vrBtn = document.getElementById("vrBtn");
  if (vrBtn) {
    vrBtn.addEventListener("click", function() {
      renderer.vrMode = true;
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

  renderer.onBeforeRender = function () {
    var vrStateAvailable = deviceManager.sensorDevice !== null;
    renderer.vrStateAvailable = vrStateAvailable;
    if (!vrStateAvailable) return;

    var vrState = deviceManager.sensorDevice.getState();

    timestamp.innerHTML = vrState.timeStamp.toFixed(2);
    orientation.innerHTML = printVector(vrState.orientation);
    position.innerHTML = printVector(vrState.position);
    angularVelocity.innerHTML = printVector(vrState.angularVelocity);
    linearVelocity.innerHTML = printVector(vrState.linearVelocity);
    angularAcceleration.innerHTML = printVector(vrState.angularAcceleration);
    linearAcceleration.innerHTML = printVector(vrState.linearAcceleration);

    renderer.updateVRState(vrState);
  }

  document.body.appendChild( renderer.domElement );
  renderer.startRendering();
}());
