
// GLOB
var state = {
  "LOADING": 1,
  "EMPTY": 2,
  "PLAY": 3
}

var myState = state.LOADING; 
var drawingCanvas;
var sT = 32;

// P5JS
window.setup = function() {
  createCanvas(sT, sT);
  
  //background(floor(random(255)),floor(random(255)), floor(random(255)));
  noStroke();
  //ellipse(width / 2, height / 2, 500, 500);
}

window.draw = function() {
  	background(floor(random(255)),floor(random(255)), floor(random(255)));


	var k = 2;
	for (var x = 0; x < width; x+=k) {
		for (var y = 0; y < height; y+=k) {
			var c = 255 * noise(0.01 * x, 0.01 * y, frameCount * 0.003);
			fill(c);
			rect(x, y, k, k);
		}		
  	}

}



// THREEJS

import * as THREE from './three.module.js';
import { ARButton } from './webxr/ARButton.js';

import { OBJLoader } from './OBJLoader.js';


var container;
var camera, scene, renderer;
var controller;

var matTotem, matShell;
var totem, outerShell;

var matrix, ray, centerReticle, reticle, rayCaster;
var OK = false, textureOK = false;


var cWhite = new THREE.Color("rgb(255, 255, 255)");
var cRed = new THREE.Color("rgb(200, 80, 80)");

// Helpers
var axesHelper, polarGridhelper, gridHelper;

init();
animate();

function init() {

	// A] Instanciation of ThreeJS + DOM 
    container = document.createElement( 'div' );
    document.body.appendChild( container );

    renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.xr.enabled = true;
    container.appendChild( renderer.domElement );

    document.body.appendChild( ARButton.createButton( renderer ) );


	// B] Scene creation
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 20 );

    var light = new THREE.HemisphereLight( 0xffffff, 0xbbbbff, 1 );
    light.position.set( 0.5, 1, 0.25 );
    scene.add( light );


		// B.1] HELPERS
	axesHelper = new THREE.AxesHelper( 0.3 );
	axesHelper.position.set(1000,1000,1000);
	scene.add( axesHelper );

	polarGridhelper = new THREE.PolarGridHelper( 3, 12, 6, 32 );
	polarGridhelper.position.set(1000,1000,1000);
	scene.add( polarGridhelper );


		// B.2] Controller + Reticule	
			// Controller
    function onSelect() {

        if ( reticle.visible && myState === state.EMPTY) {
            //mesh.position.setFromMatrixPosition( reticle.matrix );
			// // mesh.position.set( 0, 0, - 0.3 ).applyMatrix4( controller.matrixWorld );
			// // mesh.quaternion.setFromRotationMatrix( controller.matrixWorld );

            totem.position.setFromMatrixPosition( reticle.matrix );
            outerShell.position.setFromMatrixPosition( reticle.matrix );

			// Center helpers
			axesHelper.position.setFromMatrixPosition( reticle.matrix );
			axesHelper.position.y += 0.001; // to forbid Z Fighting with the polar grid
			polarGridhelper.position.setFromMatrixPosition( reticle.matrix );

	  		myState = state.PLAY; 
			totem.visible = true;
			outerShell.visible = true;
            reticle.visible = false;
    		centerReticle.visible = true;
        }

		if(myState === state.PLAY) {
			totem.traverse( function ( mainChild ) {

				if ( mainChild.isMesh ) {
					var intersection = rayCaster.intersectObject( mainChild );

					if ( intersection.length > 0 ) {
						outerShell.traverse( function ( child ) {
							if(child.idFace	== mainChild.idFace)
								child.visible = !child.visible;
						});
					}
				}

			} );
		}

    }

    controller = renderer.xr.getController( 0 );
    controller.addEventListener( 'select', onSelect );
    scene.add( controller );

			// Reticule
    matrix = new THREE.Matrix4();
    ray = new THREE.Ray();
 	rayCaster = new THREE.Raycaster();
	rayCaster.ray = ray;
    reticle = new THREE.Mesh(
        new THREE.RingBufferGeometry( 0.15, 0.2, 32 ).rotateX( - Math.PI / 2 ),
        new THREE.MeshBasicMaterial()
    );
    centerReticle = new THREE.Mesh(
        new THREE.RingBufferGeometry( 0.0015, 0.002, 32 ).rotateX( - Math.PI / 2 ),
        new THREE.MeshBasicMaterial()
    );
	centerReticle.material.side = THREE.DoubleSide;
	centerReticle.material.transparent = true;
	centerReticle.material.opacity = 0.6;
	centerReticle.material.color = new THREE.Color("rgb(155, 155, 155)");
    centerReticle.visible = false;


    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add( reticle );
    scene.add( centerReticle );


	// B.pre3] Groups
	totem = new THREE.Group();
	totem.scale.set(0.5, 0.5, 0.5);
	totem.visible = false;
	scene.add( totem );

	outerShell = new THREE.Group();
	outerShell.scale.set(0.5, 0.5, 0.5);
	outerShell.visible = false;
	scene.add( outerShell );


	// B.3] LOADERS (Texture + OBJ)

		// Manager
	var manager = new THREE.LoadingManager();
	manager.onProgress = function ( item, loaded, total ) { console.log( item, loaded, total ); };

		// Texture
	var textureLoader = new THREE.TextureLoader( manager );
	var texture = textureLoader.load( "./assets/texture.png" );

		// Obj // didn't manage to make it into one single function...
	var onLoadObjTotem = function ( obj ) { // On delivery

		// Ids, texture, and adding the faces
		var cptIdFace = 0;
		obj.traverse( function ( child ) {
			if ( child.isMesh ) {

				// Many different ones because diff in color at hover
  			    let tmpMat = new THREE.MeshLambertMaterial();
				//tmpMat.map = texture;
			    //tmpMat.map = new THREE.CanvasTexture( drawingCanvas );

					// adding to the groups
				let tmp1 = new THREE.Mesh(child.geometry, tmpMat);
				tmp1.idFace = cptIdFace;
				totem.add(tmp1);

				cptIdFace++;
			}
		} );
	}

	var onLoadObjShell = function ( obj ) { // On delivery

		// Ids, texture, and adding the faces
		var cptIdFace = 0;
		obj.traverse( function ( child ) {
			if ( child.isMesh ) {

				// Many different ones because diff in color at hover
			    //let tmpMat = new THREE.MeshLambertMaterial();
			    //tmpMat.map = new THREE.CanvasTexture( drawingCanvas );
			    //tmpMat.transparent = true;
			    //tmpMat.opacity = 0.8;  

				// Only one mat here, cause too complexe

					// adding to the groups
				let tmp2 = new THREE.Mesh(child.geometry, matShell);
				tmp2.idFace = cptIdFace;
				tmp2.visible = false;
				outerShell.add(tmp2);

				cptIdFace++;
			}
		} );
	}

		// B.4] VRAC
			//Resize
	function onWindowResize() {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		renderer.setSize( window.innerWidth, window.innerHeight );
	}

    window.addEventListener( 'resize', onWindowResize, false );


		// B.5] Sync with p5js
	async function setupCanvasDrawing() {

	  for(var i = 0; i < 10 && document.getElementsByTagName('canvas').length < 2; i++) {    
		await new Promise(r => setTimeout(r, 100));
		console.log("waiting: " + i)
	  }
	  
	  console.log(document.getElementsByTagName('canvas'));
	  drawingCanvas = document.getElementsByTagName('canvas').item(1);
	  drawingCanvas.style.width = ""+sT+"px";
	  drawingCanvas.style.height = ""+sT+"px";
	  //drawingCanvas.style.display = "none";
	  
	  // set canvas as material.map (this could be done to any map, bump, displacement etc.)
	  matTotem = new THREE.MeshLambertMaterial();
	  matTotem.map = new THREE.CanvasTexture( drawingCanvas );

	  matShell = new THREE.MeshLambertMaterial();
	  matShell.map = new THREE.CanvasTexture( drawingCanvas );
	  matShell.transparent = true;
	  matShell.opacity = 0.8;  

		// Loading of the groups object
	  var loader = new OBJLoader( manager );
	  loader.load( "./assets/totem.obj", onLoadObjTotem);
	  loader.load( "./assets/outerShell.obj", onLoadObjShell);

	  myState = state.EMPTY; 
	}

	setupCanvasDrawing();
}

function animate() {

    renderer.setAnimationLoop( render );

}

function render( timestamp, frame ) {

    if ( frame ) {
        var referenceSpace = renderer.xr.getReferenceSpace();
        var session = renderer.xr.getSession();
        var pose = frame.getViewerPose( referenceSpace );
        if ( pose ) {

			// Here we go ... !
            matrix.fromArray( pose.transform.matrix );

            ray.origin.set( 0, 0, 0 );
            ray.direction.set( 0, 0, - 1 );
            ray.applyMatrix4( matrix );

            centerReticle.position.set(0,0,-0.1);
			centerReticle.rotation.set(0,0,0);
			centerReticle.rotation.x = - Math.PI * 0.5;
			centerReticle.applyMatrix4(matrix);

            var xrRay = new XRRay( ray.origin, ray.direction );

            session.requestHitTest( xrRay, referenceSpace )
                .then( function ( results ) {

                    if ( results.length ) {

                        var hitResult = results[ 0 ];
						if(myState !== state.PLAY) {
                        	reticle.visible = true;
						}
                        reticle.matrix.fromArray( hitResult.hitMatrix );

                    } else {
                        reticle.visible = false;
                    }
                } );

			if(myState === state.PLAY) {
	  			matShell.map = new THREE.CanvasTexture( drawingCanvas );
				matShell.needsUpdate = true;

				totem.traverse( function ( child ) {
				
					if (child.isMesh) {					
						if (rayCaster.intersectObject( child ).length > 0 ) {					
							child.material.color = cRed;
						} else {
							child.material.color = cWhite;
						}
					}

				} );
			}

        }
    }

    renderer.render( scene, camera );

}


