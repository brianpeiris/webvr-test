var DeviceManager = function () {
  this.sensorDevice = null;
  this.hmdDevice = null;

  var noop = function () {};

  function perspectiveMatrixFromVRFieldOfView(fov, zNear, zFar) {
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

  var fovScale = 1.0;
  this.onResizeFOV = noop;
  this.resizeFOV = function (amount) {
    var fovLeft, fovRight;

    if (!this.hmdDevice) { return; }

    if (amount != 0 && 'setFieldOfView' in this.hmdDevice) {
      fovScale += amount;
      if (fovScale < 0.1) { fovScale = 0.1; }

      fovLeft = this.hmdDevice.getRecommendedEyeFieldOfView("left");
      fovRight = this.hmdDevice.getRecommendedEyeFieldOfView("right");

      fovLeft.upDegrees *= fovScale;
      fovLeft.downDegrees *= fovScale;
      fovLeft.leftDegrees *= fovScale;
      fovLeft.rightDegrees *= fovScale;

      fovRight.upDegrees *= fovScale;
      fovRight.downDegrees *= fovScale;
      fovRight.leftDegrees *= fovScale;
      fovRight.rightDegrees *= fovScale;

      this.hmdDevice.setFieldOfView(fovLeft, fovRight);
    }

    if ('getRecommendedRenderTargetSize' in this.hmdDevice) {
      var renderTargetSize = this.hmdDevice.getRecommendedRenderTargetSize();
      document.getElementById("renderTarget").innerHTML = renderTargetSize.width + "x" + renderTargetSize.height;
    }

    if ('getCurrentEyeFieldOfView' in this.hmdDevice) {
      fovLeft = this.hmdDevice.getCurrentEyeFieldOfView("left");
      fovRight = this.hmdDevice.getCurrentEyeFieldOfView("right");
    } else {
      fovLeft = this.hmdDevice.getRecommendedEyeFieldOfView("left");
      fovRight = this.hmdDevice.getRecommendedEyeFieldOfView("right");
    }

    cameraLeft.projectionMatrix = perspectiveMatrixFromVRFieldOfView(fovLeft, 0.1, 1000);
    cameraRight.projectionMatrix = perspectiveMatrixFromVRFieldOfView(fovRight, 0.1, 1000);
    this.onResizeFOV();
  }.bind(this);

  this.onHMDDeviceFound = noop;
  this.onSensorDeviceFound = noop;
  this.enumerateVRDevices = function (devices) {
    // First find an HMD device
    for (var i = 0; i < devices.length; ++i) {
      if (devices[i] instanceof HMDVRDevice) {
        this.hmdDevice = devices[i];

        this.onHMDDeviceFound(this.hmdDevice);

        this.resizeFOV(0.0);
      }
    }

    // Next find a sensor that matches the HMD hardwareUnitId
    for (var i = 0; i < devices.length; ++i) {
      if (devices[i] instanceof PositionSensorVRDevice &&
            (!this.hmdDevice || devices[i].hardwareUnitId == this.hmdDevice.hardwareUnitId)) {
        this.sensorDevice = devices[i];
        this.onSensorDeviceFound(this.sensorDevice);
      }
    }
  }.bind(this);

  this.onError = noop;
  this.init = function () {
    if (navigator.getVRDevices) {
      navigator.getVRDevices().then(this.enumerateVRDevices);
    } else if (navigator.mozGetVRDevices) {
      navigator.mozGetVRDevices(this.enumerateVRDevices);
    } else {
      this.onError();
    }
  }.bind(this);
};
