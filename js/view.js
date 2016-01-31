/***
 * Scaffolded by Jingjie (Vincent) Zheng on June 24, 2015.
 */

'use strict';

/**
 * A function that creates and returns the spaceship model.
 */

function createViewModule() {
   var SpaceshipView = function(model, canvas) {
      /**
       * Obtain the SpaceshipView itself.
       */
      var self = this;

      /**
       * Maintain the model.
       */
      this.model = model;

      /**
       * Maintain the canvas and its context.
       */
      this.canvas = canvas;
      this.context = canvas.getContext('2d');

      /**
       * Update the canvas. 
       * You should be able to do this trivially by first clearing the canvas, then call the rootNode's 
       * renderAll() with the context.
       */
      this.update = function() {
         // Clear canvas
         this.context.clearRect(0, 0, self.canvas.width, self.canvas.height);
         
         // Render all
         this.model.rootNode.renderAll(this.context);
      };

      /**
       * You should add the view as a listener to each node in the scene graph, so that the view can get 
       * updated when the model is changed.
       */
      this.model.rootNode.addListener(this);
      _.each(this.model.starNodes, function(node) { node.addListener(self); });
      this.model.statusNode.addListener(this);
      this.model.spaceshipNode.addListener(this);
      this.model.headNode.addListener(this);
      this.model.handleNode.addListener(this);
      this.model.portholeNode.addListener(this);
      this.model.bodyNode.addListener(this);
      this.model.tailNode.addListener(this);
      this.model.fireNode.addListener(this);

      /**
       * Handle mousedown events.
       * You should perform a hit detection here by calling the model's performHitDetection().
       */ 
      this.lastMouseCoordinates = {
         x: 0,
         y: 0
      };
      this.isKeyDown = false;
      this.isMouseDown = false;
      this.isDraggingSpaceship = false;
      this.isDraggingHandle = false;
      
      this.updateLastMouseCoordinates = function(mouseEvent) {
         this.lastMouseCoordinates = {
            x: mouseEvent.offsetX,
            y: mouseEvent.offsetY
         };
      };
      
      canvas.addEventListener('mousedown', function(e) {
         // Mouse and keys are mutually exclusive
         if (!self.isKeyDown && !self.model.getPowerUpRemainingTime()) {
            // Set the mousedown flag
            self.isMouseDown = true;
            
            // Update the last mouse coordinates
            self.updateLastMouseCoordinates(e);
            
            // Perform hit test
            var hitTestResult = self.model.performHitDetection([e.offsetX, e.offsetY]);
            
            if (hitTestResult) {
               switch (hitTestResult.id) {
                  case self.model.bodyNode.id:
                     self.isDraggingSpaceship = true;
                     self.isDraggingHandle = false;
                     break;
                  case self.model.handleNode.id:
                     self.isDraggingSpaceship = false;
                     self.isDraggingHandle = true;
                     self.model.startAdjustingBodyHeight();
                     break;
                  default:
                     self.isDraggingSpaceship = false;
                     self.isDraggingHandle = false;
               }
            }
            else { // if (!hitTestResult)
               self.isDraggingSpaceship = false;
               self.isDraggingHandle = false;
            }
         }
      });

      /**
       * Handle mousemove events.
       */ 
      canvas.addEventListener('mousemove', function(e) {
         // Mouse and keys are mutually exclusive
         if (!self.isKeyDown && !self.model.getPowerUpRemainingTime()) {
            if (self.isDraggingSpaceship) {
               // Translate the spaceship according to the mouse movement
               self.model.translateSpaceshipByGlobalMouseMove(
                  /* dx */ e.offsetX - self.lastMouseCoordinates.x, 
                  /* dy */ e.offsetY - self.lastMouseCoordinates.y
               );
            }
            
            else if (self.isDraggingHandle) {
               // Adjust the height of the spaceship
               self.model.adjustBodyHeightByGlobalMouseMove(
                  /* mouse_dx */ e.offsetX - self.lastMouseCoordinates.x, 
                  /* mouse_dy */ e.offsetY - self.lastMouseCoordinates.y
               );
            }
            
            else { // if (!self.isDraggingSpaceship && !self.isDraggingHandle)
               // Perform hit test to determine cursor type
               var hitTestResult = self.model.performHitDetection([e.offsetX, e.offsetY]);
               
               if (hitTestResult) {
                  switch (hitTestResult.id) {
                     case self.model.bodyNode.id:
                        canvas.style.cursor = 'move';
                        break;
                     case self.model.handleNode.id:
                        canvas.style.cursor = 'ns-resize';
                        break;
                     default:
                        canvas.style.cursor = 'default';
                  }
               }
               else { // if (!hitTestResult)
                  canvas.style.cursor = 'default';
               }
            }
         }
         
         else { // if (self.isKeyDown || self.model.getPowerUpRemainingTime())
            canvas.style.cursor = 'default';
         }
         
         // Update the last mouse coordinates
         self.updateLastMouseCoordinates(e);
      });


      /**
       * Handle mouseup events.
       */ 
      canvas.addEventListener('mouseup', function(e) {
         canvas.style.cursor = 'default';
         
         // Mouse and keys are mutually exclusive
         if (!self.isKeyDown) {
            // Unset the mousedown flag
            self.isMouseDown = false;
            
            // Reset all the state management flags
            self.isDraggingSpaceship = false;
            self.isDraggingHandle = false;
            
            self.model.stopAdjustingBodyHeight();
         }
      });
      
      /**
       * Keycode constants
       */
      var KEY_CODE_SPACE       = 32;
      var KEY_CODE_LEFT_ARROW  = 37;
      var KEY_CODE_UP_ARROW    = 38;
      var KEY_CODE_RIGHT_ARROW = 39;
      var KEY_CODE_DOWN_ARROW  = 40;
      
      /**
       * Handle keydown events.
       */ 
      document.addEventListener('keydown', function(e) {
         // Mouse and keys are mutually exclusive
         if (!self.isMouseDown) {
            // Set the keydown flag
            self.isKeyDown = true;
            
            switch(e.keyCode) {
               // Start moving forward
               case KEY_CODE_UP_ARROW:
                  self.model.startMovingForward();
                  break;
               
               // Turn the tail left or right
               case KEY_CODE_LEFT_ARROW:
                  self.model.startTurningTailLeft();
                  break;
               
               case KEY_CODE_RIGHT_ARROW:
                  self.model.startTurningTailRight();
                  break;
            } 
         }
      });

      /**
       * Handle keyup events.
       */
      document.addEventListener('keyup', function(e) {
         // Mouse and keys are mutually exclusive
         if (!self.isMouseDown) {
            // Unset the key down flag
            self.isKeyDown = false;
            
            switch (e.keyCode) {
               case KEY_CODE_SPACE: // Power Up 
                  self.model.requestPowerUp();
                  break;
               
               case KEY_CODE_UP_ARROW: // Stop moving forward
                  self.model.stopMovingForward();
                  break;
               
               case KEY_CODE_LEFT_ARROW: // Stop tail turning
                  self.model.stopTurningTailLeft();
                  break;
               
               case KEY_CODE_RIGHT_ARROW: // Top tail turning
                  self.model.stopTurningTailRight();
                  break;
            }
         }
      });

      /**
       * Update the view when first created.
       */
      this.update();
   };

   return {
      SpaceshipView: SpaceshipView
   };
}