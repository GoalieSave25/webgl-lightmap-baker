var CSM;
function setupCSM() {
	
	setupFrustrum();
	setupCSMShader();
	
	var _cameraToLightMatrix = new THREE.Matrix4();
	var _lightSpaceFrustum = new Frustum();
	var _center = new THREE.Vector3();
	var _bbox = new THREE.Box3();
	var _uniformArray = [];
	var _logArray = [];
	
	CSM = function( data2 ) {
		var obj = {
	
			constructor : function( data ) {
		
				data = data || {};
		
				obj.camera = data.camera;
				obj.parent = data.parent;
				obj.cascades = data.cascades || 3;
				obj.maxFar = data.maxFar || 100000;
				obj.mode = data.mode || 'practical';
				obj.shadowMapSize = data.shadowMapSize || 2048;
				obj.shadowBias = data.shadowBias || 0.000001;
				obj.lightDirection = data.lightDirection || new THREE.Vector3( 1, - 1, 1 ).normalize();
				obj.lightIntensity = data.lightIntensity || 1;
				obj.lightNear = data.lightNear || 1;
				obj.lightFar = data.lightFar || 2000;
				obj.lightMargin = data.lightMargin || 200;
				obj.customSplitsCallback = data.customSplitsCallback;
				obj.fade = false;
				obj.mainFrustum = new Frustum();
				obj.frustums = [];
				obj.breaks = [];
		
				obj.lights = [];
				obj.shaders = new Map();
		
				obj.createLights();
				obj.updateFrustums();
				obj.injectInclude();
		
			},
		
			createLights : function() {
		
				for ( var i = 0; i < obj.cascades; i ++ ) {
		
					var light = new THREE.DirectionalLight( 0xffffff, obj.lightIntensity );
					light.castShadow = true;
					light.shadow.mapSize.width = obj.shadowMapSize;
					light.shadow.mapSize.height = obj.shadowMapSize;
		
					light.shadow.camera.near = obj.lightNear;
					light.shadow.camera.far = obj.lightFar;
					light.shadow.bias = obj.shadowBias;
		
					obj.parent.add( light );
					obj.parent.add( light.target );
					obj.lights.push( light );
		
				}
		
			},
		
			initCascades : function() {
		
				var camera = obj.camera;
				camera.updateProjectionMatrix();
				obj.mainFrustum.setFromProjectionMatrix( camera.projectionMatrix, obj.maxFar );
				obj.mainFrustum.split( obj.breaks, obj.frustums );
		
			},
		
			updateShadowBounds : function() {
		
				var frustums = obj.frustums;
				for ( var i = 0; i < frustums.length; i ++ ) {
		
					var light = obj.lights[ i ];
					var shadowCam = light.shadow.camera;
					var frustum = obj.frustums[ i ];
		
					// Get the two points that represent that furthest points on the frustum assuming
					// that's either the diagonal across the far plane or the diagonal across the whole
					// frustum itself.
					var nearVerts = frustum.vertices.near;
					var farVerts = frustum.vertices.far;
					var point1 = farVerts[ 0 ];
					var point2;
					if ( point1.distanceTo( farVerts[ 2 ] ) > point1.distanceTo( nearVerts[ 2 ] ) ) {
		
						point2 = farVerts[ 2 ];
		
					} else {
		
						point2 = nearVerts[ 2 ];
		
					}
		
					var squaredBBWidth = point1.distanceTo( point2 );
					if ( obj.fade ) {
		
						// expand the shadow extents by the fade margin if fade is enabled.
						var camera = obj.camera;
						var far = Math.max( camera.far, obj.maxFar );
						var linearDepth = frustum.vertices.far[ 0 ].z / ( far - camera.near );
						var margin = 0.25 * Math.pow( linearDepth, 2.0 ) * ( far - camera.near );
		
						squaredBBWidth += margin;
		
					}
		
					shadowCam.left = - squaredBBWidth / 2;
					shadowCam.right = squaredBBWidth / 2;
					shadowCam.top = squaredBBWidth / 2;
					shadowCam.bottom = - squaredBBWidth / 2;
					shadowCam.updateProjectionMatrix();
		
				}
		
			},
		
			getBreaks : function() {
		
				var camera = obj.camera;
				var far = Math.min( camera.far, obj.maxFar );
				obj.breaks.length = 0;
		
				switch ( obj.mode ) {
		
					case 'uniform':
						uniformSplit( obj.cascades, camera.near, far, obj.breaks );
						break;
					case 'logarithmic':
						logarithmicSplit( obj.cascades, camera.near, far, obj.breaks );
						break;
					case 'practical':
						practicalSplit( obj.cascades, camera.near, far, 0.5, obj.breaks );
						break;
					case 'custom':
						if ( obj.customSplitsCallback === undefined ) console.error( 'CSM: Custom split scheme callback not defined.' );
						obj.customSplitsCallback( obj.cascades, camera.near, far, obj.breaks );
						break;
		
				}
		
				function uniformSplit( amount, near, far, target ) {
		
					for ( var i = 1; i < amount; i ++ ) {
		
						target.push( ( near + ( far - near ) * i / amount ) / far );
		
					}
		
					target.push( 1 );
		
				}
		
				function logarithmicSplit( amount, near, far, target ) {
		
					for ( var i = 1; i < amount; i ++ ) {
		
						target.push( Math.pow( near * ( far / near ), ( i / amount ) ) / far );
		
					}
		
					target.push( 1 );
		
				}
		
				function practicalSplit( amount, near, far, lambda, target ) {
		
					_uniformArray.length = 0;
					_logArray.length = 0;
					logarithmicSplit( amount, near, far, _logArray );
					uniformSplit( amount, near, far, _uniformArray );
		
					for ( var i = 1; i < amount; i ++ ) {
		
						target.push( THREE.MathUtils.lerp( _uniformArray[ i - 1 ], _logArray[ i - 1 ], lambda ) );
		
					}
		
					target.push( 1 );
		
				}
		
			},
		
			update : function() {
		
				var camera = obj.camera;
				var frustums = obj.frustums;
				for ( var i = 0; i < frustums.length; i ++ ) {
		
					var light = obj.lights[ i ];
					var shadowCam = light.shadow.camera;
					var texelWidth = ( shadowCam.right - shadowCam.left ) / obj.shadowMapSize;
					var texelHeight = ( shadowCam.top - shadowCam.bottom ) / obj.shadowMapSize;
					light.shadow.camera.updateMatrixWorld( true );
					_cameraToLightMatrix.multiplyMatrices( light.shadow.camera.matrixWorldInverse, camera.matrixWorld );
					frustums[ i ].toSpace( _cameraToLightMatrix, _lightSpaceFrustum );
		
					var nearVerts = _lightSpaceFrustum.vertices.near;
					var farVerts = _lightSpaceFrustum.vertices.far;
					_bbox.makeEmpty();
					for ( var j = 0; j < 4; j ++ ) {
		
						_bbox.expandByPoint( nearVerts[ j ] );
						_bbox.expandByPoint( farVerts[ j ] );
		
					}
		
					_bbox.getCenter( _center );
					_center.z = _bbox.max.z + obj.lightMargin;
					_center.x = Math.floor( _center.x / texelWidth ) * texelWidth;
					_center.y = Math.floor( _center.y / texelHeight ) * texelHeight;
					_center.applyMatrix4( light.shadow.camera.matrixWorld );
		
					light.position.copy( _center );
					light.target.position.copy( _center );
		
					light.target.position.x += obj.lightDirection.x;
					light.target.position.y += obj.lightDirection.y;
					light.target.position.z += obj.lightDirection.z;
		
				}
		
			},
		
			injectInclude : function() {
		
				THREE.ShaderChunk.lights_fragment_begin = CSMShader.lights_fragment_begin;
				THREE.ShaderChunk.lights_pars_begin = CSMShader.lights_pars_begin;
		
			},
		
			setupMaterial : function( material ) {
		
				material.defines = material.defines || {};
				material.defines.USE_CSM = 1;
				material.defines.CSM_CASCADES = obj.cascades;
		
				if ( obj.fade ) {
		
					material.defines.CSM_FADE = '';
		
				}
		
				var breaksVec2 = [];
				var scope = obj;
				var shaders = obj.shaders;
		
				material.onBeforeCompile = function ( shader ) {
		
					var far = Math.min( scope.camera.far, scope.maxFar );
					scope.getExtendedBreaks( breaksVec2 );
		
					shader.uniforms.CSM_cascades = { value: breaksVec2 };
					shader.uniforms.cameraNear = { value: scope.camera.near };
					shader.uniforms.shadowFar = { value: far };
		
					shaders.set( material, shader );
		
				};
		
				shaders.set( material, null );
		
			},
		
			updateUniforms : function() {
		
				var far = Math.min( obj.camera.far, obj.maxFar );
				var shaders = obj.shaders;
		
				shaders.forEach( function ( shader, material ) {
		
					if ( shader !== null ) {
		
						var uniforms = shader.uniforms;
						obj.getExtendedBreaks( uniforms.CSM_cascades.value );
						uniforms.cameraNear.value = obj.camera.near;
						uniforms.shadowFar.value = far;
		
					}
		
					if ( ! obj.fade && 'CSM_FADE' in material.defines ) {
		
						delete material.defines.CSM_FADE;
						material.needsUpdate = true;
		
					} else if ( obj.fade && ! ( 'CSM_FADE' in material.defines ) ) {
		
						material.defines.CSM_FADE = '';
						material.needsUpdate = true;
		
					}
		
				}, obj );
		
			},
		
			getExtendedBreaks : function( target ) {
		
				while ( target.length < obj.breaks.length ) {
		
					target.push( new THREE.Vector2() );
		
				}
		
				target.length = obj.breaks.length;
		
				for ( var i = 0; i < obj.cascades; i ++ ) {
		
					var amount = obj.breaks[ i ];
					var prev = obj.breaks[ i - 1 ] || 0;
					target[ i ].x = prev;
					target[ i ].y = amount;
		
				}
		
			},
		
			updateFrustums : function() {
		
				obj.getBreaks();
				obj.initCascades();
				obj.updateShadowBounds();
				obj.updateUniforms();
		
			},
		
			remove : function() {
		
				for ( var i = 0; i < obj.lights.length; i ++ ) {
		
					obj.parent.remove( obj.lights[ i ] );
		
				}
		
			},
		
			dispose : function() {
		
				var shaders = obj.shaders;
				shaders.forEach( function ( shader, material ) {
		
					delete material.onBeforeCompile;
					delete material.defines.USE_CSM;
					delete material.defines.CSM_CASCADES;
					delete material.defines.CSM_FADE;
		
					if ( shader !== null ) {
		
						delete shader.uniforms.CSM_cascades;
						delete shader.uniforms.cameraNear;
						delete shader.uniforms.shadowFar;
		
					}
		
					material.needsUpdate = true;
		
				} );
				shaders.clear();
		
			}
		}
		obj.constructor( data2 );
		return obj;
	}
}