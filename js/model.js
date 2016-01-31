/***
 * Scaffolded by Jingjie (Vincent) Zheng on June 24, 2015.
 */

'use strict';

/**
 * A function that creates and returns the spaceship model.
 */

function createModelModule() {
   var SpaceshipModel = function() {

      var sceneGraphModule = createSceneGraphModule();
      var self = this;
      
      /*
       * Maintain a list of nodes for iteration when performing hit detection.
       */
      this.nodes = [];

      /**
       * Instantiate the scene graph here.
       */
      this.rootNode = new sceneGraphModule.RootNode('scene');
      
      this.starNodes = [];
      for (var i = 0; i < 16; i++) {
         var node = new sceneGraphModule.StarNode('star' + i, this.rootNode);
         
         // Translate the stars randomly throughout the background
         node.translate(
            Math.random() * (this.rootNode.localBoundingBox.x + this.rootNode.localBoundingBox.w),
            Math.random() * (this.rootNode.localBoundingBox.y + this.rootNode.localBoundingBox.h)
         );
        
        // Add the node to the collection
        this.starNodes.push(node);  
      }

      this.spaceshipNode = new sceneGraphModule.SpaceshipNode('spaceship', this.rootNode);
      this.spaceshipNode.translate(400, 360);

      this.headNode = new sceneGraphModule.HeadNode('head', this.spaceshipNode);
      this.headNode.translate(0, -120);
      
      this.bodyNode = new sceneGraphModule.BodyNode('body', this.spaceshipNode);
      this.bodyNode.translate(0, 0);
      
      this.handleNode = new sceneGraphModule.HandleNode('handle', this.bodyNode);
      this.handleNode.translate(0, -120);
      
      this.portholeNode = new sceneGraphModule.PortholeNode('porthole', this.bodyNode);
      this.portholeNode.translate(0, -90);
      
      this.tailNode = new sceneGraphModule.TailNode('tail', this.spaceshipNode);
      this.tailNode.translate(0, 0);
      
      this.fireNode = new sceneGraphModule.FireNode('fire', this.tailNode);
      this.fireNode.translate(0, 20);
      
      this.statusNode = new sceneGraphModule.StatusNode('status', this.rootNode);
      this.statusNode.setModel(this);
      this.statusNode.translate(5, 5);

      /**
       * Push every node into the the nodes list.
       */
      this.nodes.push(this.fireNode);
      this.nodes.push(this.tailNode);
      this.nodes.push(this.portholeNode);
      this.nodes.push(this.handleNode);
      this.nodes.push(this.bodyNode);
      this.nodes.push(this.headNode);
      this.nodes.push(this.spaceshipNode);
      this.nodes.push(this.statusNode);
      _.each(this.starNodes, function(node) { self.nodes.push(node); });
      this.nodes.push(this.rootNode);
      
      /**
       * State control and parameter rate of change control variables
       */
      // Power Up mangement
      this.isInPowerUpMode  = false; // Power-up state
      this.lastPowerUpStartTime = undefined;
      this.POWER_UP_TIMEOUT = 5000; // Time delay until power-up expires
      
      // Handle dragging management
      this.isDraggingHandle = false;
      this.handleDraggingExtraBucket = 0; // Traps any "extra" dragging performed by the user which cannot be satisfied by the model
                                          // (e.g., if they try to resize beyond the min size, we "bucket" the extra dragging for later undoing)
      
      // Tail animation loop event handles
      this.tailLeftTurnEventHandle  = undefined;
      this.tailRightTurnEventHandle = undefined;
      
      // Forward movement rate of change control
      this.MOVE_FORWARD_INTERVAL = 15; // 1000/60 ~ 16.67 => "60 fps"
      this.MOVE_FORWARD_STEP     = 7;
      
      // Movement momentum management
      this.currentMoveForwardMomentum                    = 0.000; // Momentum ranges between [0, 1]
      this.MOVE_FORWARD_MOMENTUM_SEED                    = 0.001; // Value to "start up" the momentum
      this.MOVE_FORWARD_MOMENTUM_ACCELERATION_STEP       = 0.023; // Acceleration step ('+=' -- LINEAR acceleration when above transition %)
      this.MOVE_FORWARD_MOMENTUM_ACCELERATION_TRANSITION = 0.050; // Engine power % value to transition from quadratic to linear acceleration
      this.MOVE_FORWARD_MOMENTUM_DECELERATION_FACTOR     = 0.965; // Deceleration factor ('*=' -- QUADRATIC deceleration)
      
      // Acceleration event loops
      this.moveForwardAccelerationEventHandle = undefined;
      this.moveForwardDecelerationEventHandle = undefined;
      
      // Tail angle management
      this.tailTheta              = 0;            // Current theta of the tail
      this.TAIL_THETA_LEFT_LIMIT  = Math.PI / 4;  // Tail theta cannot be > pi/4
      this.TAIL_THETA_RIGHT_LIMIT = -Math.PI / 4; // Tail theta cannot be < -pi/4
      
      // Tail rotation rate of change control
      this.TAIL_TURN_INTERVAL       = 15;
      this.TAIL_TURN_STEP           = Math.PI / 120;
      this.TAIL_TURN_DAMPING_FACTOR = 0.06; // Damping factor to reduce the effect of the tail orientation on the ship's rotation
      
      /**
       * Animation loop for rocket movement
       */
      this.moveLoopEventHandle = setInterval(function() {
         // Only animate if the momentum is above the seed value
         if (self.currentMoveForwardMomentum >= self.MOVE_FORWARD_MOMENTUM_SEED) {
            // Rotate the spaceship by the negative of the tail angle
            self.spaceshipNode.rotate(
               /* theta */ -self.currentMoveForwardMomentum
                           * self.TAIL_TURN_DAMPING_FACTOR
                           * self.tailTheta
                             // Ease out the turn when the engine is turned off
                           * (self.moveForwardDecelerationEventHandle ? Math.pow(self.currentMoveForwardMomentum, 3) : 1),
               /*   x   */ 0,
               /*   y   */ 0
            );
            
            // Translate the spaceship
            self.spaceshipNode.translate(0, -self.currentMoveForwardMomentum * self.MOVE_FORWARD_STEP);
            
            // Check if the entire ship is off the canvas:
            // 1. Convert the local bounding box to be relative to the RootNode
            //    (assuming RootNode itself doesn't transform much)
            var localBoundingBoxCorners = [
               /* TL.x */ self.spaceshipNode.localBoundingBox.x,
               /* TL.y */ self.spaceshipNode.localBoundingBox.y,
               /* TR.x */ self.spaceshipNode.localBoundingBox.x + self.spaceshipNode.localBoundingBox.w,
               /* TR.y */ self.spaceshipNode.localBoundingBox.y,
               /* BR.x */ self.spaceshipNode.localBoundingBox.x + self.spaceshipNode.localBoundingBox.w,
               /* BR.y */ self.spaceshipNode.localBoundingBox.y + self.spaceshipNode.localBoundingBox.h,
               /* BL.x */ self.spaceshipNode.localBoundingBox.x,
               /* BL.y */ self.spaceshipNode.localBoundingBox.y + self.spaceshipNode.localBoundingBox.h
            ];
            var globalBoundingBoxCorners = [];
            self.spaceshipNode.globalTransformation.transform(
               /* src    */ localBoundingBoxCorners,
               /* srcOff */ 0,
               /* dst    */ globalBoundingBoxCorners,
               /* dstOff */ 0,
               /* numPts */ 4
            );
            
            //   - For convenience, split globalBoundingBoxCorners into x and y arrays
            var globalX = [], globalY = [];
            for (var i = 0; i < 8; i++) {
               if (i % 2 == 0) {
                  globalX.push(globalBoundingBoxCorners[i]);
               }
               else {
                  globalY.push(globalBoundingBoxCorners[i]);
               }
            }
            
            // 2. Check if the bounding box is outside the RootNode bounding box
            var queuedDeltaX = 0; // Queued deltas so we translate all at once
            var queuedDeltaY = 0;
            
            //   - Determine the dimensions of the global rectangular bounding box
            //     (accounting for rotations, scaling, etc.)
            var globalWidth  = _.max(globalX) - _.min(globalX);
            var globalHeight = _.max(globalY) - _.min(globalY);
            
            var globalRootWidth  = self.rootNode.localBoundingBox.w;
            var globalRootHeight = self.rootNode.localBoundingBox.h;
            
            //   - Handle cases where spaceship exceeds horizontal dimensions of the RootNode
            //     +-> Left Side
            if (_.every(globalX, function(x) { return x < self.rootNode.localBoundingBox.x; })) {
               // Queue the horizontal translation to swap the SpaceshipNode to the right side
               queuedDeltaX += globalRootWidth + globalWidth;
               
               // console.log('exceeded side on LEFT');
            }
            //     +-> Right Side
            else if (_.every(globalX, function(x) { return x > self.rootNode.localBoundingBox.x + self.rootNode.localBoundingBox.w; })) {
               queuedDeltaX -= globalRootWidth + globalWidth;
               
               // console.log('exceeded side on RIGHT');
            }
            
            //   - Handle cases where spaceship exceeds vertical dimensions of the RootNode
            //     +-> Top Side
            if (_.every(globalY, function(y) { return y < self.rootNode.localBoundingBox.y; })) {
               // Queue the vertical translation to swap the SpaceshipNode to the bottom
               queuedDeltaY += globalRootHeight + globalHeight;
               
               // console.log('exceeded side on TOP');
            }
            //     +-> Bottom Side
            else if (_.every(globalY, function(y) { return y > self.rootNode.localBoundingBox.y + self.rootNode.localBoundingBox.h; })) {
               queuedDeltaY -= globalRootHeight + globalHeight;
               
               // console.log('exceeded side on BOTTOM');
            }
            
            // Perform the queued translations in the global context
            if (queuedDeltaX || queuedDeltaY) {
               // console.log('globalWidth     = ' + globalWidth.toFixed(2) +     ', globalHeight     = ' + globalHeight.toFixed(2));
               // console.log('globalRootWidth = ' + globalRootWidth.toFixed(2) + ', globalRootHeight = ' + globalRootHeight.toFixed(2));
               // console.log('--> applying corrections: queuedDeltaX = ' + queuedDeltaX.toFixed(2) + ', queuedDeltaY = ' + queuedDeltaY.toFixed(2));
               self.spaceshipNode.translateAsGlobal(queuedDeltaX, queuedDeltaY);
            }
         }
         
         else {
            // Perform a renderAll to draw the stars even if we don't have any movement
            self.rootNode.translate(0, 0);
         }
      }, this.MOVE_FORWARD_INTERVAL);
   };

   _.extend(SpaceshipModel.prototype, {
      /**
         * Perform hit detection and return the hit node.
         * @param point: Point in the world view, i.e., from the perspective of the canvas.
         * @return 
         *   null if no node is hit, otherwise return the hit node.
         */
      performHitDetection: function(point) {
         var result = _.find(this.nodes, function(node) {
            if (node.performHitDetection(point)) {
               return node;
            }
         });
         if (result) {
            return result;
         } 
         return null;
      },
      
      /**
       * Request the spaceship to power up.
       * Automatically returns the spaceship to the normal size/etc when
       * the timer expires after POWER_UP_TIMEOUT (5 seconds).
       * Does nothing if the spaceship is already powered up.
       */
      requestPowerUp: function() {
         if (!this.isInPowerUpMode) {
            // Set the powered up flag and time
            this.isInPowerUpMode = true;
            this.lastPowerUpStartTime = new Date();
            
            // Scale the spaceship
            this.spaceshipNode.scale(2, 2);
            
            // Adjust the movement velocity
            // this.MOVE_FORWARD_STEP *= 2;
            
            // Undo the transformation after POWER_UP_TIMEOUT (5 seconds)
            var self = this;
            setTimeout(function() {
               self.spaceshipNode.scale(0.5, 0.5);
               // self.MOVE_FORWARD_STEP /= 2;
               self.isInPowerUpMode = false;
            }, this.POWER_UP_TIMEOUT);
         }
      },
      
      /**
       * Get the amount of time remaining in seconds until the current powerup expires.
       */
      getPowerUpRemainingTime: function() {
         if (!this.lastPowerUpStartTime) {
            return 0;
         }
         
         var secondsSince = ((new Date()).getTime() - this.lastPowerUpStartTime.getTime())/1000;
         var secondsRemaining = this.POWER_UP_TIMEOUT/1000 - secondsSince;
         
         if (secondsRemaining < 0) {
            return 0;
         }
         else {
            return secondsRemaining;
         }
      },
      
      /**
       * Control the mouse dragging the spaceship
       */
      translateSpaceshipByGlobalMouseMove: function(mouse_dx, mouse_dy) {
         this.spaceshipNode.translateAsGlobal(
            /* dx */ mouse_dx,
            /* dy */ mouse_dy
         );
      },
      
      /**
       * Control the forward movement of the spaceship
       */
      startMovingForward: function() {
         // Show the fire
         this.fireNode.setVisible(true);
         
         // Stop any in-progress deceleration loop
         if (this.moveForwardDecelerationEventHandle) {
            clearInterval(this.moveForwardDecelerationEventHandle);
            this.moveForwardDecelerationEventHandle = undefined;
         }
         
         // Start a loop to gradually accelerate the rocket
         if (!this.moveForwardAccelerationEventHandle) {
            var self = this;
            this.moveForwardAccelerationEventHandle = setInterval(function() {
               // 'Damping factor' used to stall acceleration before we hit MOVE_FORWARD_MOMENTUM_ACCELERATION_TRANSITION
               var factor = Math.min(
                  self.currentMoveForwardMomentum / self.MOVE_FORWARD_MOMENTUM_ACCELERATION_TRANSITION,
                  1
               );
               
               // If the momentum value is below the seed value
               if (self.currentMoveForwardMomentum < self.MOVE_FORWARD_MOMENTUM_SEED) {
                  // Seed the momentum value
                  self.currentMoveForwardMomentum = self.MOVE_FORWARD_MOMENTUM_SEED;
               }
               // If stepping the momentum again would increase it beyond the allowed amount
               else if (self.currentMoveForwardMomentum + factor * self.MOVE_FORWARD_MOMENTUM_ACCELERATION_STEP > 1) {
                  // Cap it to 1
                  self.currentMoveForwardMomentum = 1;
                  
                  // Stop the loop (since this is no longer productive)
                  clearInterval(self.moveForwardAccelerationEventHandle);
                  self.moveForwardAccelerationEventHandle = undefined;
               }
               // Otherwise, step the momentum by MOVE_FORWARD_MOMENTUM_ACCELERATION_STEP
               else {
                  self.currentMoveForwardMomentum += factor * self.MOVE_FORWARD_MOMENTUM_ACCELERATION_STEP;
               }
            }, this.MOVE_FORWARD_INTERVAL);
         }
      },
      
      stopMovingForward: function() {
         // Hide the fire
         this.fireNode.setVisible(false);
         
         // Stop any in-progress acceleration loop
         if (this.moveForwardAccelerationEventHandle) {
            clearInterval(this.moveForwardAccelerationEventHandle);
            this.moveForwardAccelerationEventHandle = undefined;
         }
         
         // Start a loop to gradually decelerate the rocket
         var self = this;
         this.moveForwardDecelerationEventHandle = setInterval(function() {
            // If the momentum is below the seed value
            if (self.currentMoveForwardMomentum < self.MOVE_FORWARD_MOMENTUM_SEED) {
               // Set it to 0
               self.currentMoveForwardMomentum = 0;
               
               // Stop this loop
               clearInterval(self.moveForwardDecelerationEventHandle);
            }
            // Otherwise, step the momentum down by MOVE_FORWARD_MOMENTUM_DECELERATION_FACTOR
            else {
               self.currentMoveForwardMomentum *= self.MOVE_FORWARD_MOMENTUM_DECELERATION_FACTOR;
            }
         }, this.MOVE_FORWARD_INTERVAL);
      },
      
      /**
       * Control the direction of the tail component
       */
      startTurningTailLeft: function() {
         if (!this.tailLeftTurnEventHandle) {
            var self = this;
            this.tailLeftTurnEventHandle = setInterval(function() {
               // Only turn if we still have allowance to
               if (self.tailTheta < self.TAIL_THETA_LEFT_LIMIT) {
                  // Determine how far we will turn this time (min of TAIL_TURN_STEP
                  // or the remaining allowance before we hit TAIL_THETA_LEFT_LIMIT)
                  var thisTurnTheta = Math.min(self.TAIL_TURN_STEP, self.TAIL_THETA_LEFT_LIMIT - self.tailTheta);
                  
                  // Store the rotation
                  self.tailTheta += thisTurnTheta;
                  
                  // Apply the rotation
                  self.tailNode.rotate(
                     /* theta */ thisTurnTheta,
                     /*   x   */ 0,
                     /*   y   */ self.tailNode.localBoundingBox.y
                  );
               }
            }, this.TAIL_TURN_INTERVAL);
         }
      },
      
      stopTurningTailLeft: function() {
         clearInterval(this.tailLeftTurnEventHandle);
         this.tailLeftTurnEventHandle = undefined;
      },
      
      startTurningTailRight: function() {
         if (!this.tailRightTurnEventHandle) {
            var self = this;
            this.tailRightTurnEventHandle = setInterval(function() {
               // Only turn if we still have allowance to
               if (self.tailTheta > self.TAIL_THETA_RIGHT_LIMIT) {
                  // Determine how far we will turn this time (max of -TAIL_TURN_STEP
                  // and the negative remaining allowance before we hit TAIL_THETA_RIGHT_LIMIT)
                  var thisTurnTheta = Math.max(-self.TAIL_TURN_STEP, self.TAIL_THETA_RIGHT_LIMIT - self.tailTheta);
                  
                  // Store the rotation
                  self.tailTheta += thisTurnTheta;
                  
                  // Apply the rotation
                  self.tailNode.rotate(
                     /* theta */ thisTurnTheta,
                     /*   x   */ 0,
                     /*   y   */ self.tailNode.localBoundingBox.y
                  );
               }
            }, this.TAIL_TURN_INTERVAL);
         }
      },
      
      stopTurningTailRight: function() {
         clearInterval(this.tailRightTurnEventHandle);
         this.tailRightTurnEventHandle = undefined;
      },
      
      /**
       * Adjust the height of the spaceship body.
       */
      
      startAdjustingBodyHeight: function() {
         // Start tracking height adjustment requests
         this.isDraggingHandle = true;
         
         // Clear the extra dragging bucket
         this.handleDraggingExtraBucket = 0;
      },
      
      // Tries to adjust the height of the body, then:
      //    1. Adjusts the localBoundingBox of the SpaceshipNode
      //    2. Translates the HeadNode accordingly
      //    3. Translates the HandleNode accordingly
      //    4. Translates the PortholeNode accordingly
      adjustBodyHeightByGlobalMouseMove: function(mouse_dx, mouse_dy) {
         if (this.isDraggingHandle) {
            // Transform the mouse movement into the local SpaceshipNode coordinate space 
            var transformedPoints = [];
            this.spaceshipNode.globalTransformation.createInverse().transform(
               /* src    */ [0, 0, mouse_dx, mouse_dy],
               /* srcOff */ 0,
               /* dst    */ transformedPoints,
               /* dstOff */ 0,
               /* numPts */ 2
            );
            
            // Calculate the requested adjustment amount
            var local_dy = transformedPoints[3] - transformedPoints[1];
            var requestedAdjustment = -local_dy;
            
            // Check the bucket for any adjustment we must exhaust first
            if (this.handleDraggingExtraBucket) {
               // If the sign is the same, we can't use the request to try to exhaust the bucket
               if ((this.handleDraggingExtraBucket < 0 && requestedAdjustment < 0)
                  || (this.handleDraggingExtraBucket > 0 && requestedAdjustment > 0)) {
                  
                  // Add the request to the bucket and exit
                  this.handleDraggingExtraBucket += requestedAdjustment;
                  
                  return;
               }
               
               // If the sign is different, we can try to exhaust the bucket
               else {
                  if (Math.abs(this.handleDraggingExtraBucket) < Math.abs(requestedAdjustment)) {
                     // We've exhausted the bucket! Reduce the requested adjustment by the bucket amount
                     requestedAdjustment += this.handleDraggingExtraBucket;
                     
                     // Zero the bucket
                     this.handleDraggingExtraBucket = 0;
                  }
                  else {
                     // The request isn't big enough to exhaust the bucket. Reduce the bucket amount
                     // by the request amount and exit
                     this.handleDraggingExtraBucket += requestedAdjustment;
                     
                     return;
                  }
               }
            }
            
            // Request the BodyNode to resize
            var actualAdjustment = this.bodyNode.resize(requestedAdjustment);
            
            // Add any difference between the actual and requested adjustments to the bucket
            if (requestedAdjustment - actualAdjustment) {
               this.handleDraggingExtraBucket += requestedAdjustment - actualAdjustment;
            }
            
            // Adjust the localBoundingBox of the Spaceship Node
            this.spaceshipNode.localBoundingBox.h += actualAdjustment;
            this.spaceshipNode.localBoundingBox.y -= actualAdjustment;
            
            // Translate the HeadNode by the actual adjustment amount
            this.headNode.translate(0, -actualAdjustment);
            
            // Translate the HandleNode by the actual adjustment amount
            this.handleNode.translate(0, -actualAdjustment);
            
            // Translate the PortholeNode by the actual adjustment amount
            this.portholeNode.translate(0, -actualAdjustment);
         }
      },
      
      stopAdjustingBodyHeight: function() {
         // Stop tracking height adjustment requests
         this.isDraggingHandle = false;
      }
   });

   return {
      SpaceshipModel: SpaceshipModel
   };
}