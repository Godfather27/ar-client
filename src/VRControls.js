import {
  Matrix4
} from 'three';

export default class VRControls {
  constructor ( object, onError ) {
    this.object = object;
    // the Rift SDK returns the position in meters
    // this scale factor allows the user to define how meters
    // are converted to scene units.
    this.scale = 1;
    
    // If true will use "standing space" coordinate system where y=0 is the
    // floor and x=0, z=0 is the center of the room.
    this.standing = false;

    // Distance from the users eyes to the floor in meters. Used when
    // standing=true but the VRDisplay doesn't provide stageParameters.
    this.userHeight = 1.6;

    this.vrDisplay = null;
    this.vrDisplays = null;
    this.standingMatrix = new Matrix4();
    this.frameData = 'VRFrameData' in window ? new VRFrameData() : null;

    
    let that = this;
    if ( navigator.getVRDisplays ) {
      navigator.getVRDisplays()
        .then(function (displays) {
          that.vrDisplays = displays;
          if ( displays.length > 0 ) {
            that.vrDisplay = displays[ 0 ];
          } else {
            if ( onError ) onError( 'VR input not available.' );
          }
        })
        .catch((err) => {
          console.error("unable",err)
          // console.warn( 'THREE.VRControls: Unable to get VR Displays' );
        });
    }
  };
  
  getVRDisplay() {
    return this.vrDisplay;
  }

  setVRDisplay(value) {
    this.vrDisplay = value;
  };

  getVRDisplays() {
    console.warn( 'THREE.VRControls: getVRDisplays() is being deprecated.' );
    return this.vrDisplays;
  };

  getStandingMatrix() {
    return this.standingMatrix;
  };

  update() {
    if ( this.vrDisplay ) {
      var pose;
      if ( this.vrDisplay.getFrameData ) {
        this.vrDisplay.getFrameData( this.frameData );
        pose = this.frameData.pose;
      } else if ( this.vrDisplay.getPose ) {
        pose = this.vrDisplay.getPose();
      }

      if ( pose.orientation !== null ) {
        this.object.quaternion.fromArray( pose.orientation );
      }

      if ( pose.position !== null ) {
        this.object.position.fromArray( pose.position );
      } else {
        this.object.position.set( 0, 0, 0 );
      }

      if ( this.standing ) {
        if ( this.vrDisplay.stageParameters ) {
          this.object.updateMatrix();
          this.standingMatrix.fromArray( this.vrDisplay.stageParameters.sittingToStandingTransform );
          this.object.applyMatrix( standingMatrix );
        } else {
          this.object.position.setY( this.object.position.y + this.userHeight );
        }
      }
      this.object.position.multiplyScalar( this.scale );
    }
  };

  dispose() {
    this.vrDisplay = null;
  };
}
