var Frustum;
function setupFrustrum() {
	var inverseProjectionMatrix = new THREE.Matrix4();
	Frustum = function( data ) {
		var obj = {
			constructor : function( data ) {
		
				data = data || {};
		
				this.vertices = {
					near: [
						new THREE.Vector3(),
						new THREE.Vector3(),
						new THREE.Vector3(),
						new THREE.Vector3()
					],
					far: [
						new THREE.Vector3(),
						new THREE.Vector3(),
						new THREE.Vector3(),
						new THREE.Vector3()
					]
				};
		
				if ( data.projectionMatrix !== undefined ) {
		
					this.setFromProjectionMatrix( data.projectionMatrix, data.maxFar || 10000 );
		
				}
		
			},
		
			setFromProjectionMatrix : function( projectionMatrix, maxFar ) {
		
				var isOrthographic = projectionMatrix.elements[ 2 * 4 + 3 ] === 0;
		
				inverseProjectionMatrix.copy( projectionMatrix ).invert();
		
				// 3 --- 0  vertices.near/far order
				// |     |
				// 2 --- 1
				// clip space spans from [-1, 1]
		
				this.vertices.near[ 0 ].set( 1, 1, - 1 );
				this.vertices.near[ 1 ].set( 1, - 1, - 1 );
				this.vertices.near[ 2 ].set( - 1, - 1, - 1 );
				this.vertices.near[ 3 ].set( - 1, 1, - 1 );
				this.vertices.near.forEach( function ( v ) {
		
					v.applyMatrix4( inverseProjectionMatrix );
		
				} );
		
				this.vertices.far[ 0 ].set( 1, 1, 1 );
				this.vertices.far[ 1 ].set( 1, - 1, 1 );
				this.vertices.far[ 2 ].set( - 1, - 1, 1 );
				this.vertices.far[ 3 ].set( - 1, 1, 1 );
				this.vertices.far.forEach( function ( v ) {
		
					v.applyMatrix4( inverseProjectionMatrix );
		
					var absZ = Math.abs( v.z );
					if ( isOrthographic ) {
		
						v.z *= Math.min( maxFar / absZ, 1.0 );
		
					} else {
		
						v.multiplyScalar( Math.min( maxFar / absZ, 1.0 ) );
		
					}
		
				} );
		
				return this.vertices;
		
			},
		
			split : function( breaks, target ) {
		
				while ( breaks.length > target.length ) {
		
					target.push( new Frustum() );
		
				}
		
				target.length = breaks.length;
		
				for ( var i = 0; i < breaks.length; i ++ ) {
		
					var cascade = target[ i ];
		
					if ( i === 0 ) {
		
						for ( var j = 0; j < 4; j ++ ) {
		
							cascade.vertices.near[ j ].copy( this.vertices.near[ j ] );
		
						}
		
					} else {
		
						for ( var j = 0; j < 4; j ++ ) {
		
							cascade.vertices.near[ j ].lerpVectors( this.vertices.near[ j ], this.vertices.far[ j ], breaks[ i - 1 ] );
		
						}
		
					}
		
					if ( i === breaks - 1 ) {
		
						for ( var j = 0; j < 4; j ++ ) {
		
							cascade.vertices.far[ j ].copy( this.vertices.far[ j ] );
		
						}
		
					} else {
		
						for ( var j = 0; j < 4; j ++ ) {
		
							cascade.vertices.far[ j ].lerpVectors( this.vertices.near[ j ], this.vertices.far[ j ], breaks[ i ] );
		
						}
		
					}
		
				}
		
			},
		
			toSpace : function( cameraMatrix, target ) {
		
				for ( var i = 0; i < 4; i ++ ) {
		
					target.vertices.near[ i ]
						.copy( this.vertices.near[ i ] )
						.applyMatrix4( cameraMatrix );
		
					target.vertices.far[ i ]
						.copy( this.vertices.far[ i ] )
						.applyMatrix4( cameraMatrix );
		
				}
		
			}
		
		}
		obj.constructor( data );
		return obj;
	}
}