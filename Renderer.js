var Renderer = function () {
  var noop = function () {};
  var VR_POSITION_SCALE = 25;

  var cameraLeft = new THREE.PerspectiveCamera( 75, 4/3, 0.1, 1000 );
  var cameraRight = new THREE.PerspectiveCamera( 75, 4/3, 0.1, 1000 );
  this.setCameraOffsets = function (eyeOffsetLeft, eyeOffsetRight) {
    cameraLeft.position.sub(eyeOffsetLeft);
    cameraLeft.position.z = 12;

    cameraRight.position.sub(eyeOffsetRight);
    cameraRight.position.z = 12;
  };
  this.setProjectionMatrices = function (
    leftProjectionMatrix, rightProjectionMatrix
  ) {
    cameraLeft.projectionMatrix = leftProjectionMatrix;
    cameraRight.projectionMatrix = rightProjectionMatrix;
  };

  var threeRenderer = new THREE.WebGLRenderer(
    { preserveDrawingBuffer: true });
  threeRenderer.setClearColor(0x202020, 1.0);
  this.domElement = threeRenderer.domElement;
  var camera = new THREE.PerspectiveCamera(
    75, window.innerWidth / window.innerHeight, 0.1, 1000 );
  var rift = null;
  var scene = new THREE.Scene();
  var riftObj = new THREE.Object3D();
  this.setupScene = function () {

    var ambient = new THREE.AmbientLight( 0x444444 );
    scene.add( ambient );

    var directionalLight = new THREE.DirectionalLight( 0xffeedd );
    directionalLight.position.set( 0, 0, 1 ).normalize();
    scene.add( directionalLight );

    var riftDiffuse = THREE.ImageUtils.loadTexture(
      "media/maps/diffuse/DK2diffuse.jpg" );
    riftDiffuse.anisotropy = 16;

    var riftNormal = THREE.ImageUtils.loadTexture(
      "media/maps/normal/DK2normal.jpg" );
    riftNormal.anisotropy = 16;

    var riftMaterial = new THREE.MeshPhongMaterial( {
      map: riftDiffuse,
      normalMap: riftNormal
    } );

    scene.add(riftObj);

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
  };
  this.setupScene();

  this.resize = function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    threeRenderer.setSize( window.innerWidth, window.innerHeight );
  }

  this.updateVRState = function (vrState) {
    if (riftObj) {
      riftObj.position.x = vrState.position.x * VR_POSITION_SCALE;
      riftObj.position.y = vrState.position.y * VR_POSITION_SCALE;
      riftObj.position.z = vrState.position.z * VR_POSITION_SCALE;

      riftObj.quaternion.x = vrState.orientation.x;
      riftObj.quaternion.y = vrState.orientation.y;
      riftObj.quaternion.z = vrState.orientation.z;
      riftObj.quaternion.w = vrState.orientation.w;
    }
  };

  this.vrMode = false;
  this.onBeforeRender = noop;
  var render = this.startRendering = function () {
    requestAnimationFrame(render.bind(this));

    this.onBeforeRender();

    if (!this.vrStateAvailable && rift) {
      // If we don't have a VR device just spin the model around to give us
      // something pretty to look at.
      rift.rotation.y += 0.01;
    }

    if (this.vrMode) {
      // Render left eye
      threeRenderer.enableScissorTest ( true );
      threeRenderer.setScissor(
        0, 0, window.innerWidth / 2, window.innerHeight );
      threeRenderer.setViewport(
        0, 0, window.innerWidth / 2, window.innerHeight );
      threeRenderer.render(scene, cameraLeft);

      // Render right eye
      threeRenderer.setScissor(
        window.innerWidth / 2, 0, window.innerWidth / 2, window.innerHeight );
      threeRenderer.setViewport(
        window.innerWidth / 2, 0, window.innerWidth / 2, window.innerHeight );
      threeRenderer.render(scene, cameraRight);
    } else {
      // Render mono view
      threeRenderer.enableScissorTest ( false );
      threeRenderer.setViewport( 0, 0, window.innerWidth, window.innerHeight );
      threeRenderer.render(scene, camera);
    }
  }
};
