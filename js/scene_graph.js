/***
 * Scaffolded by Jingjie (Vincent) Zheng on June 24, 2015.
 */

'use strict';

/**
 * A function that creates and returns the scene graph classes.
 * This module has an astract GraphNode which generalises the behaviour of a node in a scene graph.
 * Other classes inherit the GraphNode, forming a tree structure when instantiated.
 * - RootNode represents the background and the scene.
 * - SpaceshipNode represents the spaceship.
 * - BodyNode, HeadNode, and TailNode represent the three parts that belong to the spaceship.
 * - HandleNode refers to the black handle on the top of the body.
 * - FireNode belongs to the tail, representing the fire at the end of the spaceship.
 * These classes should be instantiated in model.js.
 */
function createSceneGraphModule() {
   
   var SG_DEBUG_SHOW_BOUNDING_BOXES = false;
   var SG_DEBUG_ACTIVATE_BODY_ROLLS = false;

   /**
    * An abstract graph node in a scene graph.
    * @param id: Node identifier.
    * @param parent: Parent of the node in the scene graph.
    */
   var GraphNode = function(id, parent) {
      // Maintain the identifier.
      this.id = id;

      // Maintain a local transformation that is relative to its parent.
      this.localTransformation = new AffineTransform();

      // Maintain a global transformation that is relative to the canvas coordinate.
      // This matrix is useful when performing a hit detection.
      this.globalTransformation = new AffineTransform();

      // If a valid parent is passed in, save the parent to this node, then add this node to the parent.
      this.parent = typeof parent !== 'undefined' ? parent : null;
      if (parent) {
         parent.addChild(this);
      }

      // Maintain a list of child nodes.
      this.children = [];

      // Local bounding box of this node. This should be overridden by concrete graph nodes.
      // The coordinate of the bounding box is from the perspective of the node itself, not 
      // from the canvas.
      this.localBoundingBox = {
         x: 0,
         y: 0,
         w: 0,
         h: 0
      };

      // Indicate whether this node is interactable with a mouse. If it is not interactable with 
      // mouse at all, we do not need to perform a hit detection on it.
      this.isInteractableWithMouse = false;

      // Maintain a list of listners.
      this.listeners = [];
   };

   _.extend(GraphNode.prototype, {
      
      /**
       * Notify all listeners the change in this node.
       */
      notify: function() {
         _.each(this.listeners, function(listener) {
            listener.update();
         });
      },

      /**
       * Add a listener, if it is not registered with this node.
       * @param listener: Object that listens for the change of the node.
       */
      addListener: function(listener) {
         if (this.listeners.indexOf(listener) === -1) {
            this.listeners.push(listener);
         }
      },

      /**
       * Remove a listener, if it is registered with this node.
       * @param listener: Listener that is registered with this node. 
       */
      removeListener: function(listener) {
         this.listeners = _.without(this.listeners, listener);
      },

      /**
       * Add a child node to this node if it is not appended to this node.
       * 
       * You should point the child's parent to this node and add the child to the children list.
       * You should also recursively update the global transformations of its descendants, as they are
       * appended to a new parent.
       * @param node: Child node to be added.
       */
      addChild: function(node) {
         if (this.children.indexOf(node) === -1) {
            // Add the child node to the list of children
            this.children.push(node);
            
            // Set the child's parent to this
            node.parent = this;
            
            // Update the global transformations
            node.updateAllGlobalTransformation();
         }
      },

      /**
       * Remove a child node of this node, if it is appended to this node.
       * @param node: Child node to be removed.
       */
      removeChild: function(node) {
         this.children = _.without(this.children, node);
      },

      /**
       * Apply a Google Closure AffineTransform object to the HTML5 Canvas context.
       * @param context: HTML5 Canvas context.
       * @param transformation: Google Closure AffineTransform object.
       */
      applyTransformationToContext: function(context, transformation) {
         context.transform(transformation.m00_, 
            transformation.m10_,
            transformation.m01_,
            transformation.m11_,
            transformation.m02_,
            transformation.m12_);
      },

      /**
       * Update the global transformation of _ONLY_ this node.
       * Specifically, if it is the root of the scene graph, update itself with its local 
       * transformation, otherwise clone the global transformation of its parent, then concatenate it 
       * with this node's local transformation.
       */
      updateGlobalTransformation: function() {
         // If this is the root of the scene graph
         if (!this.parent) {
            // Update the global transformation with the local transformation
            this.globalTransformation.copyFrom(this.localTransformation);
         }
         
         // Otherwise (if this is not the root of the scene graph)
         else {
            // Clone the global transformation of the parent
            var parentGlobalTransformationClone = this.parent.globalTransformation.clone();
            
            // Concatenate it with this node's local transformation
            parentGlobalTransformationClone.concatenate(this.localTransformation);
            this.globalTransformation.copyFrom(parentGlobalTransformationClone);
            
            // this.localTransformation.concatenate(parentGlobalTransformation);
         }
      },

      /**
       * Update the global transformations of this node and its descendants recursively.
       */
      updateAllGlobalTransformation: function() {
         // Update this node's global transformation
         this.updateGlobalTransformation();
         
         // Update all the children's global transformations
         _.each(this.children, function(child) {
            child.updateAllGlobalTransformation();
         });
      },

      /**
       * Render _ONLY_ this node with the assumption that the node is painted at around the origin. 
       * @param context: Context obtained from HTML5 Canvas.
       */
      renderLocal: function(context) {
         // GraphNode.renderLocal() doesn't need to do anything since it's overridden
         // by all the children so this implementation is only called on RootNode
      },

      /**
       * Recursively render itself and its descendants.
       * 
       * Specifically, 
       * 1. Save Canvas context before performing any operation.
       * 2. Apply local transformation to the context.
       * 3. Render the node and its children, 
       * 4. Restore Canvas context.
       *
       * @param context: Context obtained from HTML Canvas.
       */
      renderAll: function(context) {
         // Save canvas context
         context.save();
         
         // Apply local transformations
         this.applyTransformationToContext(context, this.localTransformation);
         
         // Render the node
         this.renderLocal(context);
         
         if (SG_DEBUG_SHOW_BOUNDING_BOXES) {
            context.save();
            
            // Select a random colour and side for drawing this component
            if (!this._debug_colour) {
               this._debug_colour = 'hsl(' + Math.floor(Math.random() * 360) + ', 100%, 60%)';
               this._debug_textSide = Math.random() < 0.5 ? 'left' : 'right';
            }
            
            // Draw the origin
            context.strokeStyle = this._debug_colour;
            context.beginPath();
            context.lineWidth = 2;
            context.moveTo(-4,  4);
            context.lineTo( 4, -4);
            context.moveTo( 4,  4);
            context.lineTo(-4, -4);
            context.stroke();
            
            // Draw the bounding rect
            context.strokeStyle = this._debug_colour;
            context.lineWidth = 1;
            context.strokeRect(
               /* x */ this.localBoundingBox.x,
               /* y */ this.localBoundingBox.y,
               /* w */ this.localBoundingBox.w,
               /* h */ this.localBoundingBox.h
            );
            
            // Label the item
            context.font = "100% sans-serif";
            context.textAlign = this._debug_textSide;
            context.textBaseline = "middle";
            context.fillStyle = this._debug_colour;
            context.fillText(
               ' ' + this.id + ' ',
               this.localBoundingBox.x
                  + (this._debug_textSide === 'left' ? this.localBoundingBox.w : 0),
               this.localBoundingBox.y);
            
            context.restore();
         }
         
         // Render the children
         _.each(this.children, function(child) {
            child.renderAll(context);
         });
         
         // Restore canvas context
         context.restore();
      },

      /**
       * Rotate this node and its descendants.
       * 
       * Specifically, 
       * 1. Concatenate a rotation matrix after the current local transformation. This would apply 
       *    the rotation prior to other transformation that has been applied to this node. It is 
       *    equivalent to using the inverse of the current local transformation to return this node 
       *    back to the origin, applying the rotation, and transforming this node back with the local
       *    transformation.
       * 2. Update the global transformation. Applying change to this node would in fact change the 
       *    positions and orientations of all its descendants. Thus, you should update the global 
       *    transformation matrix of itself and all its descendants. This allows us to perform a O(1)
       *    hit detection without the need to concatenate local matrices along the hierarchy each
       *    time we perform the hit detection.
       * 3. Finally, notify the view to update. This would make the canvas to repaint the scene graph
       *    by traversing down the tree.
       *
       * You do not need to traverse down the tree to update every descendant's local transformation,
       * since the scene graph will render this node's children based on the transformation applied to
       * the node.
       *  
       * @param theta: Angle to rotate clockwise.
       * @param x, y: Centre of Rotation.
       */
      rotate: function(theta, x, y) {
         // Concatenate a rotation matrix after the current local transformation
         this.localTransformation.rotate(theta, x, y);
         
         // Update the global transformation recursively
         this.updateAllGlobalTransformation();
         
         // Notify the view to update
         this.notify();
      },

      /**
       * Translate this node and its descendants.
       * 
       * Specifically, 
       * 1. Concatenate a translation matrix after the current local transformation. 
       * 2. Update the global transfomration recursively to the node and its descendants.
       * 3. Finally, notify the view to update.
       * 
       * @param dx: Distance to translate in the x direction from the node's coordinate system.
       * @param dy: Distance to translate in the y direction from the node's coordinate system.
       */
      translate: function(dx, dy) {
         // Concatenate a translation matrix after the current local transformation
         this.localTransformation.translate(dx, dy);
         
         // Update the global transformation recursively
         this.updateAllGlobalTransformation();
         
         // Notify the view to update
         this.notify();
      },
      
      /**
       * Translate this node in the global absolute coordinate space instead of the
       * local coordinate space.
       */
      translateAsGlobal: function(dx, dy) {
         // Transform the global coordinates so that they are relative to the local
         // coordinate space
         
         var transformedPoints = [];
         this.globalTransformation.createInverse().transform(
            /* src    */ [0, 0, dx, dy],
            /* srcOff */ 0,
            /* dst    */ transformedPoints, 
            /* dstOff */ 0,
            /* numPts */ 2
         );
         
         // Calculate the delta in the local coordinate space
         var deltaX = transformedPoints[2] - transformedPoints[0];
         var deltaY = transformedPoints[3] - transformedPoints[1];
         
         // console.log('--> translateAsGlobal: Converting ('
         //    + dx.toFixed(2)
         //    + ', '
         //    + dy.toFixed(2)
         //    + ') => ('
         //    + deltaX.toFixed(2)
         //    + ', '
         //    + deltaY.toFixed(2)
         //    + ')');
         
         // Translate
         this.translate(deltaX, deltaY);
      },

      /**
       * Scale this node and its descendants.
       * 
       * Specifically, 
       * 1. Concatenate a scaling matrix after the current local transformation. 
       * 2. Update the global transfomration recursively to the node and its descendants.
       * 3. Finally, notify the view to update.
       *
       * Note that doing this would propogate the scaling to its descendants when rendering.
       * You may also need another function to scale the shape by updating its rendering dimensions
       * as well as its bounding box.
       *
       * @param sx: Scaling factor in the x direction from the node's coordinate system.
       * @param sy: Scaling factor in the y direction from the node's coordinate system.
       */
      scale: function(sx, sy) {
         // Concatenate a scale matrix after the current local transformation
         this.localTransformation.scale(sx, sy);
         
         // Update the global transformation recursively
         this.updateAllGlobalTransformation();
         
         // Notify the view to update
         this.notify();
      },

      /** 
        * Check whether a point is within the local bounding box.
        * Specifically, 
        * if this node is interactable with a mouse,
        * 1. Create the inverse matrix of the current global transformation.
        * 2. Transform the point with the matrix, so that the point becomes the coordinate relative
        *    to this node.
        * 3. Check with the transformed point whether it's in the local bounding box.
        * 
        * If it does not interact with a mouse, there is no need to perform a hit detection, 
        * you should return false.
        *
        * @param point: Point to be checked. It is a coordinate represented with list [x y].
        *               It is always the coordinate from the perspective of the canvas, i.e., 
        *               in the world view.
        * 
        * @return false if the node is not interactable with a mouse. When it is, return true if the 
        *         point is in the local bounding box, otherwise false.
        */
      performHitDetection: function(point) {
         // If the node is interactable with a mouse
         if (this.isInteractableWithMouse) {
            // Transform the incoming point to be relative to the local this node
            var transformedPoint = [];
            
            // Take the inverse of the local global transformation matrix and transform
            // the point
            this.globalTransformation.createInverse().transform(
               /* src    */ point,
               /* srcOff */ 0,
               /* dst    */ transformedPoint,
               /* dstOff */ 0,
               /* numPts */ 1
            );
            
            // Check if it's within the local bounding box
            var inLocalBoundingBox =
               transformedPoint[0] >= this.localBoundingBox.x &&
               transformedPoint[0] <= this.localBoundingBox.x + this.localBoundingBox.w &&
               transformedPoint[1] >= this.localBoundingBox.y &&
               transformedPoint[1] <= this.localBoundingBox.y + this.localBoundingBox.h;
            
            // console.log(
            //     'Timestamp: ' + (new Date()).toTimeString() + '\n'
            //     + 'Responder: ' + this.id + '\n'
            //     + 'Incoming point: (' + point[0] + ', ' + point[1] + ')\n'
            //     + 'Transformed point: (' + transformedPoint[0] + ', ' + transformedPoint[1] + ')\n'
            //     + 'In local bounding box ('
            //         + 'x in [' + this.localBoundingBox.x + ', ' + (this.localBoundingBox.x + this.localBoundingBox.w) 
            //         + '], '
            //         + 'y in [' + this.localBoundingBox.y + ', ' + (this.localBoundingBox.y + this.localBoundingBox.h)
            //         + '])?\n   => '
            //     + (inLocalBoundingBox ? 'yes' : 'no')
            // );
            
            return inLocalBoundingBox;
         }
         
         // Otherwise (if not interactable with mouse)
         else {
            return false;
         }
      }
   });


   /**
    * RootNode is the root of the scene graph, i.e., it represents the canvas.
    */
   var RootNode = function() {
      // Inherit the constructor of GraphNode.
      GraphNode.apply(this, arguments);

      // Override the local bounding box of this node.
      this.localBoundingBox = {
         x: 0,
         y: 0,
         w: 800,
         h: 600
      };
   };

   // Inherit all other methods of GraphNode.
   _.extend(RootNode.prototype, GraphNode.prototype, {
      // TODO
   });
   
   
   /**
    * StarNode is a child of RootNode, representing a star blinking in the background.
    */
   var StarNode = function() {
      GraphNode.apply(this, arguments);
      
      // Override the local bounding box of this node
      this.localBoundingBox = {
         x: -10,
         y: -10,
         w: 20,
         h: 20
      };
      
      // Set the custom draw path
      this.drawPath = new Path2D();
      this.drawPath.moveTo(0, -10);
      
      var cpx = [ 0,  2,   0,  -2,  0];
      var cpy = [-2,  0,   2,   0, -2];
      var x   = [10,  0, -10,   0, 10];
      var y   = [ 0, 10,   0, -10,  0];
      
      for (var i = 0; i < 4; i++) {
         this.drawPath.bezierCurveTo(
            /* cp1x */ cpx[i],
            /* cp1y */ cpy[i],
            /* cp2x */ cpx[i+1],
            /* cp2y */ cpy[i+1],
            /* x    */ x[i],
            /* y    */ y[i]
         );
      }
      
      this.drawPath.closePath();
      
      // Drawing parameters
      var self = this;
      this.CYCLE_STATE_BETWEEN_CYCLES = 0;
      this.CYCLE_STATE_IN_CYCLE       = 1;
      this.CYCLE_GAP    = 480 * Math.random() + 180;        // Gap between cycles
      this.CYCLE_LENGTH = 240 * Math.random() +  60;        // Length of each cycle
      this.cycleState   = this.CYCLE_STATE_BETWEEN_CYCLES;  // Current status of this star
      this.cycleCounter = Math.floor(Math.random() * this.CYCLE_GAP); // Counter
      this.cycleFunction = function(t) {
         // Base function to control the brightness curve
         var baseFunction = function(x) {
            return Math.atan(5*x - 2.5)/2.4 + 0.5;
         };
         
         // Scale t to [0, 1] based on where we are in the cycle
         var halfCycleLength = self.CYCLE_LENGTH / 2;
         var scaledT = t < halfCycleLength
            ? t / halfCycleLength
            : 2 - t / halfCycleLength;
         
         // Return the value of the baseFunction with the scaled t-value
         return baseFunction(scaledT);
      };
   }
   
   _.extend(StarNode.prototype, GraphNode.prototype, {
      renderLocal: function(context) {
         
         if (SG_DEBUG_ACTIVATE_BODY_ROLLS) {
            var bodyRollsImg = document.getElementById('sp-body-rolls');
            var factor = Math.abs(Math.sin(this.cycleCounter/(this.CYCLE_LENGTH/1.2)));
            this.cycleCounter += 4;
            
            context.save();
            context.scale(
               0.2 * factor,
               0.2 * factor
            );
            context.globalAlpha = Math.abs(factor);
            context.drawImage(
               bodyRollsImg,
               -161,
               -161
            );
            context.restore();
            return;
         }
         
         switch (this.cycleState) {
            case this.CYCLE_STATE_BETWEEN_CYCLES:
               // Basically do nothing if we're between cycles except increment counter
               this.cycleCounter++;
               
               // Roll over to CYCLE_STATE_IN_CYCLE if we're reached the end of the CYCLE_GAP
               if (this.cycleCounter > this.CYCLE_GAP) {
                  this.cycleState = this.CYCLE_STATE_IN_CYCLE;
                  this.cycleCounter = 0;
               }
               break;
            
            case this.CYCLE_STATE_IN_CYCLE:
               // Save the context
               context.save();
               
               // Evaluate the cycleFunction to get the current scale / alpha factor
               var factor = this.cycleFunction(this.cycleCounter);
               
               // Draw the star
               context.scale(factor, factor);
               context.fillStyle = 'hsla(51, 100%, 50%, ' + Math.min(1, (factor < 0 ? 0 : factor)) + ')';
               context.fill(this.drawPath);
               
               // Restore the context
               context.restore();
               
               // Roll over to CYCLE_STATE_BETWEEN_CYCLES if we've reached the end of the CYCLE_LENGTH
               this.cycleCounter++;
               
               if (this.cycleCounter > this.CYCLE_LENGTH) {
                  this.cycleState = this.CYCLE_STATE_BETWEEN_CYCLES;
                  this.cycleCounter = 0;
               }
               break;
            
            default:
               console.log('Unrecognized this.cycleState: ' + this.cycleState);
         }
      }
   });
   
   /**
    * StatusNode is a child of RootNode, representing the status item display.
    * 
    * StatusNode displays the time remaining until the powerup runs out, or the instructional
    * hint text if the powerup is not currently active.
    */
   var StatusNode = function() {
      GraphNode.apply(this, arguments);
      
      // Override the local bounding box of this node
      this.localBoundingBox = {
         x: 0,
         y: 0,
         w: 250,
         h: 266
      };
      
      // Drawing parameters
      this.INDICATOR_OPACITY         = 0.85;
      this.INDICATOR_VALUE_OPACITY   = 1;
      this.INDICATOR_BORDER_X_OFFSET = 0;
      this.INDICATOR_BORDER_Y_OFFSET = 0;
      this.INDICATOR_BORDER_HEIGHT   = 37;
      this.INDICATOR_BORDER_WIDTH    = 200; //this.localBoundingBox.w;
      this.INDICATOR_FILL_X_OFFSET   = 6;
      this.INDICATOR_FILL_Y_OFFSET   = 6;
      this.INDICATOR_FILL_HEIGHT     = 25;
      this.INDICATOR_FILL_MAX_WIDTH  = this.INDICATOR_BORDER_WIDTH - 12; //this.localBoundingBox.w - 12;
      this.INDICATOR_LABEL_X_OFFSET  = 0;
      this.INDICATOR_LABEL_Y_OFFSET  = this.INDICATOR_BORDER_HEIGHT + 5;
      this.INDICATOR_TOTAL_HEIGHT    = 70;
      
      this.powerupWasActive         = false;
      this.powerupDropDownYOffset   = -this.INDICATOR_TOTAL_HEIGHT;
      this.POWERUP_DROP_DOWN_FACTOR = 1.2;
      
      this.MONOSPACE_FONT_LIST      = ' "Consolas", "Monaco", monospace';
      this.GENERAL_FONT_LIST        = /*' "Proxima Nova",*/ ' "Consolas", "Monaco", monospace';
   };
   
   _.extend(StatusNode.prototype, GraphNode.prototype, {
      // Set the model so we can poll for information
      setModel: function(model) {
         this.model = model;
      },
      
      /**
       * Render the nth indicator in the status area.
       * 
       * @param context: The drawing context
       * @param nthIndicator: The 0-based index of this indicator
       * @param progressPercent: A number between 0 and 100 indicating the progress
       * @param showRedProgress: Whether to turn the progress bar red as it drops below 50%
       * @param innerLabelNumber: The number to show inside the progress indicator
       * @param innerLabelUnit: The unit of the inner progress indicator
       * @param outerLabel: The label to show below the progress indicator
       * @param yOffset: Optional parameter to vertially offset the indicator
       */
      renderIndicator: function(context, nthIndicator, percent, showRedProgress, innerLabelNumber, innerLabelUnit, outerLabel, yOffset) {
         // Save the context
         context.save();
         
         // Make yOffset computable
         yOffset = yOffset | 0;
         
         // Draw the inner bar fill
         if (showRedProgress) {
            context.fillStyle = 'hsla(0, 100%, '
              + (Math.max(
                    0,
                    (percent > 50
                       ? 1 
                       : percent / 50) * 50) + 50
                 ) 
              + '%, '
              + this.INDICATOR_OPACITY
              + ')';
         }
         else {
            context.fillStyle = 'hsla(0, 100%, 100%, ' + this.INDICATOR_OPACITY + ')';
         }
         context.fillRect(
            /* x */ this.INDICATOR_FILL_X_OFFSET,
            /* y */ nthIndicator * this.INDICATOR_TOTAL_HEIGHT
                    + this.INDICATOR_FILL_Y_OFFSET
                    + yOffset,
            /* w */ (percent / 100) * this.INDICATOR_FILL_MAX_WIDTH,
            /* h */ this.INDICATOR_FILL_HEIGHT
         );
         
         // Draw the bar inner label
         context.font = '10pt' + this.MONOSPACE_FONT_LIST;
         context.textAlign = 'right';
         context.textBaseline = 'bottom';
         context.lineWidth = 3;
         context.fillStyle = 'hsla(0, 100%, 0%, ' + this.INDICATOR_VALUE_OPACITY + ')';;
         
         var innerLabelNumberPart = Math.floor(innerLabelNumber);
         var innerLabelDecimalPart = (innerLabelNumber - innerLabelNumberPart).toFixed(1).substring(1) + innerLabelUnit;
         var innerLabelDecimalPartWidth = context.measureText(innerLabelDecimalPart).width;
         
         //    - stroke
         context.strokeText(
            /* text */ innerLabelDecimalPart,
            /* x    */ this.INDICATOR_FILL_MAX_WIDTH + this.INDICATOR_FILL_X_OFFSET - 3,
            /* y    */ nthIndicator * this.INDICATOR_TOTAL_HEIGHT
                       + this.INDICATOR_FILL_HEIGHT + this.INDICATOR_FILL_Y_OFFSET - 1
                       + yOffset
         );
         context.font = '14pt' + this.MONOSPACE_FONT_LIST;
         context.strokeText(
            /* text */ innerLabelNumberPart,
            /* x    */ this.INDICATOR_FILL_MAX_WIDTH + this.INDICATOR_FILL_X_OFFSET - 3
                       - innerLabelDecimalPartWidth,
            /* y    */ nthIndicator * this.INDICATOR_TOTAL_HEIGHT
                       + this.INDICATOR_FILL_HEIGHT + this.INDICATOR_FILL_Y_OFFSET + 1
                       + yOffset
         );
         
         //    - text
         context.font = '10pt' + this.MONOSPACE_FONT_LIST;
         context.fillStyle = 'rgba(0, 255, 0, ' + this.INDICATOR_VALUE_OPACITY + ')'; // '#0f0'; // 'hsl(' + (percent * 1.1) + ', 100%, 50%)';
         context.fillText(
            /* text */ innerLabelDecimalPart,
            /* x    */ this.INDICATOR_FILL_MAX_WIDTH + this.INDICATOR_FILL_X_OFFSET - 3,
            /* y    */ nthIndicator * this.INDICATOR_TOTAL_HEIGHT
                       + this.INDICATOR_FILL_HEIGHT + this.INDICATOR_FILL_Y_OFFSET - 1
                       + yOffset
         );
         context.font = '14pt' + this.MONOSPACE_FONT_LIST;
         context.fillText(
            /* text */ innerLabelNumberPart,
            /* x    */ this.INDICATOR_FILL_MAX_WIDTH + this.INDICATOR_FILL_X_OFFSET - 3
                       - innerLabelDecimalPartWidth,
            /* y    */ nthIndicator * this.INDICATOR_TOTAL_HEIGHT
                       + this.INDICATOR_FILL_HEIGHT + this.INDICATOR_FILL_Y_OFFSET + 1
                       + yOffset
         );
         
         // Draw the bar border
         context.strokeStyle = 'hsla(0, 100%, 100%, ' + this.INDICATOR_OPACITY + ')';
         context.lineWidth = 4;
         context.strokeRect(
            /* x */ this.INDICATOR_BORDER_X_OFFSET,
            /* y */ nthIndicator * this.INDICATOR_TOTAL_HEIGHT
                    + this.INDICATOR_BORDER_Y_OFFSET
                    + yOffset,
            /* w */ this.INDICATOR_BORDER_WIDTH,
            /* h */ this.INDICATOR_BORDER_HEIGHT
         );
         
         // Draw the outside label
         context.fillStyle = 'hsla(0, 100%, 100%, ' + this.INDICATOR_OPACITY + ')';
         context.font = "14pt" + this.GENERAL_FONT_LIST;
         context.textAlign = "left";
         context.textBaseline = "top";
         context.fillText(
            /* text */ outerLabel,
            /* x    */ this.INDICATOR_LABEL_X_OFFSET,
            /* y    */ nthIndicator * this.INDICATOR_TOTAL_HEIGHT
                       + this.INDICATOR_LABEL_Y_OFFSET
                       + yOffset
         );
         
         // Restore the context
         context.restore();
      },
      
      renderLocal: function(context) {
         var secondsRemaining = (this.model ? this.model.getPowerUpRemainingTime() : 0);
         var percentRemaining = 100 * secondsRemaining / (this.model.POWER_UP_TIMEOUT / 1000);
         
         var enginePowerPercent = (this.model ? this.model.currentMoveForwardMomentum : 0) * 100;
         
         // Save the context
         context.save();
         
         // Draw the engine power indicator
         this.renderIndicator(
            /* context          */ context,
            /* nthIndicator     */ 0,
            /* percent          */ enginePowerPercent,
            /* showRedProgress  */ false,
            /* innerLabelNumber */ enginePowerPercent,
            /* innerLabelUnit   */ '',
            /* outerLabel       */ 'ENGINE POWER %'
         );
         
         // Draw the powerup remaining indicator if we're powered up
         if (this.powerupWasActive) {
            if (secondsRemaining) {
               this.powerupDropDownYOffset /= this.POWERUP_DROP_DOWN_FACTOR;
               if (Math.abs(this.powerupDropDownYOffset) < 1) {
                  this.powerupDropDownYOffset = 0;
               }
            }
            else { // if (!secondsRemaining)
               this.powerupDropDownYOffset = -1;
               this.powerupWasActive = false;
            }
         }
         else if (!this.powerupWasActive) {
            if (secondsRemaining) {
               this.powerupWasActive = true;
               this.powerupDropDownYOffset = -this.INDICATOR_TOTAL_HEIGHT;
            }
            else { // if (!secondsRemaining)
               this.powerupDropDownYOffset *= this.POWERUP_DROP_DOWN_FACTOR;
               if (Math.abs(this.powerupDropDownYOffset) > this.INDICATOR_TOTAL_HEIGHT) {
                  this.powerupDropDownYOffset = -this.INDICATOR_TOTAL_HEIGHT;
               }
            }
         }
         
         context.save();
         context.globalAlpha = Math.abs((this.INDICATOR_TOTAL_HEIGHT + this.powerupDropDownYOffset) / this.INDICATOR_TOTAL_HEIGHT);
         
         this.renderIndicator(
            /* context         */ context,
            /* nthIndicator    */ 1,
            /* percent         */ percentRemaining,
            /* showRedProgress */ true,
            /* innerLabel      */ secondsRemaining,
            /* innerLabelUnit  */ 's',
            /* outerLabel      */ 'POWERUP REMAINING',
            /* yOffset         */ this.powerupDropDownYOffset 
         );
         
         context.restore();
         
         // Draw the available actions
         var hintOffsetIndex = 0;  // Index in the list
         var hintOffsetDelta = 16; // y-distance between consecutive item tops
         var hintOffsetExtra = 20; // Extra offset amount for tweaking
         context.fillStyle = 'hsla(0, 0%, 75%, ' + this.INDICATOR_OPACITY + ')';
         context.font = "12pt" + this.GENERAL_FONT_LIST;
         context.textAlign = 'left';
         context.textBaseline = 'bottom';
         
         // Available Actions title
         context.fillText(
            'AVAILABLE ACTIONS',
            this.INDICATOR_LABEL_X_OFFSET,
            2 + 14 + 2 * this.INDICATOR_TOTAL_HEIGHT + this.powerupDropDownYOffset
         );
         
         // Title underline
         context.strokeStyle = context.fillStyle;
         context.lineWidth = 2;
         context.beginPath();
         context.moveTo(
            this.INDICATOR_LABEL_X_OFFSET,
            2 + 14 + 2 * this.INDICATOR_TOTAL_HEIGHT + this.powerupDropDownYOffset
         );
         context.lineTo(
            this.INDICATOR_LABEL_X_OFFSET + context.measureText('AVAILABLE ACTIONS').width,
            2 + 14 + 2 * this.INDICATOR_TOTAL_HEIGHT + this.powerupDropDownYOffset
         );
         context.stroke();
         
         // Item listing
         context.textBaseline = 'top';
         context.font = "10pt" + this.GENERAL_FONT_LIST;
         
         // Engine power
         context.fillText(
            ' - power engine........[↑]',
            this.INDICATOR_LABEL_X_OFFSET,
            2 * this.INDICATOR_TOTAL_HEIGHT + (hintOffsetIndex++ * hintOffsetDelta) + this.powerupDropDownYOffset + hintOffsetExtra
         );
         
         // Turning
         context.fillText(
            ' - turn............[←]/[→]',
            this.INDICATOR_LABEL_X_OFFSET,
            2 * this.INDICATOR_TOTAL_HEIGHT + (hintOffsetIndex++ * hintOffsetDelta) + this.powerupDropDownYOffset + hintOffsetExtra
         );
         
         // Power up (if not currently powered up)
         if (secondsRemaining) {
            context.save();
            context.globalAlpha = 0.5;
         }
         context.fillText(
            (secondsRemaining ? ' x power up...........WAIT' : ' - power up........[space]') + '',
            this.INDICATOR_LABEL_X_OFFSET,
            2 * this.INDICATOR_TOTAL_HEIGHT + (hintOffsetIndex++ * hintOffsetDelta) + this.powerupDropDownYOffset + hintOffsetExtra
         );
         if (secondsRemaining) {
            context.restore();
         }
         
         // Drag and resize (if not currently powered up and not currently moving)
         if (secondsRemaining || (enginePowerPercent > 20)) {
            context.save();
            context.globalAlpha = 0.5;
         }
         context.fillText(
            ((secondsRemaining || (enginePowerPercent > 20)) ? ' x' : ' -') + ' drag & resize ship',
            this.INDICATOR_LABEL_X_OFFSET,
            2 * this.INDICATOR_TOTAL_HEIGHT + (hintOffsetIndex++ * hintOffsetDelta) + this.powerupDropDownYOffset + hintOffsetExtra
         );
         // Reduce spacing between related items
         hintOffsetExtra -= 4;
         context.fillText(
            (secondsRemaining
               ? '   ....UNAVAIL: POWERED UP'
               : (enginePowerPercent > 20
                  ? '   .....UNAVAIL: IN MOTION'
                  : '   ..............use mouse')),
            this.INDICATOR_LABEL_X_OFFSET,
            2 * this.INDICATOR_TOTAL_HEIGHT + (hintOffsetIndex++ * hintOffsetDelta) + this.powerupDropDownYOffset + hintOffsetExtra
         );
         if (secondsRemaining || (enginePowerPercent > 20)) {
            context.restore();
         }
         
         // Body rolls
         if (SG_DEBUG_ACTIVATE_BODY_ROLLS) {
            context.fillText(
               ' - body rolls',
               this.INDICATOR_LABEL_X_OFFSET,
               2 * this.INDICATOR_TOTAL_HEIGHT + (hintOffsetIndex++ * hintOffsetDelta) + this.powerupDropDownYOffset + hintOffsetExtra
            );
            hintOffsetExtra -= 4;
            context.fillText(
               '   .......activate spandex',
               this.INDICATOR_LABEL_X_OFFSET,
               2 * this.INDICATOR_TOTAL_HEIGHT + (hintOffsetIndex++ * hintOffsetDelta) + this.powerupDropDownYOffset + hintOffsetExtra
            );
         }
         
         // Draw any debug options
         var debugOptions = (SG_DEBUG_ACTIVATE_BODY_ROLLS ? 'SG_DEBUG_ACTIVATE_BODY_ROLLS   ' : '')
            + (SG_DEBUG_SHOW_BOUNDING_BOXES ? 'SG_DEBUG_SHOW_BOUNDING_BOXES   ' : '');
            
         if (debugOptions) {
            context.textAlign = 'left';
            context.textBaseline = 'top';
            context.fillStyle = '#000';
            context.strokeStyle= '#000';
            context.lineWidth = 4;
            context.strokeText(
               debugOptions,
               0,
               0
            );
            context.fillStyle = '#ff0';
            context.fillText(
               debugOptions,
               0,
               0
            );
         }
         
         // Restore the context
         context.restore();
      }
   })

   /**
    * SpaceshipNode, representing the whole spaceship.
    */
   var SpaceshipNode = function() {
      // Inherit the constructor of GraphNode.
      GraphNode.apply(this, arguments);

      // Override the local bounding box of this node. You might want to modify this.
      this.localBoundingBox = {
         x: -20,
         y: -150,
         w: 40,
         h: 200
      };
   }

   // Inherit all other methods of GraphNode.
   _.extend(SpaceshipNode.prototype, GraphNode.prototype, {
      // Override the renderLocal function to draw itself in its own coordinate system.
      renderLocal: function(context) {
         // SpaceshipNode.renderLocal doesn't need to do anything
      }
   });



   /**
    * HeadNode is the child of the spaceship node, representing the head of the spaceship.
    */
   var HeadNode = function() {
      // Inherit the constructor of GraphNode.
      GraphNode.apply(this, arguments);

      // Create the local draw path
      this.drawPath = new Path2D();
      this.drawPath.moveTo(  0, -30);
      this.drawPath.lineTo( 15,   0);
      this.drawPath.lineTo(-15,   0);
      this.drawPath.closePath();

      // Override the local bounding box of this node
      this.localBoundingBox = {
         x: -15,
         y: -30,
         w: 30,
         h: 30
      };
   }

   // Inherit all other methods of GraphNode.
   _.extend(HeadNode.prototype, GraphNode.prototype, {
      // Override the renderLocal function to draw itself in its own coordinate system.
      renderLocal: function(context) {
         // Save the context
         context.save();
         
         // Fill the triangle for the head
         context.fillStyle = "#d11";
         context.fill(this.drawPath);
         
         // Add a stroke around the triangle
         context.strokeStyle = "#fff";
         context.lineWidth = 1;
         context.stroke(this.drawPath);
         
         // Restore the context
         context.restore();
      }
   });




   /**
    * TailNode is a child of the spaceship node, representing the tail of the spaceship.
    */
   var TailNode = function() {
      GraphNode.apply(this, arguments);
      
      // Create the local draw path
      this.drawPath = new Path2D();
      this.drawPath.moveTo(  0,  0);
      this.drawPath.lineTo( 20, 20);
      this.drawPath.lineTo(-20, 20);
      this.drawPath.closePath();

      // Override the local bounding box of this node
      this.localBoundingBox = {
         x: -20,
         y: 0,
         w: 40,
         h: 20
      };
   }
   _.extend(TailNode.prototype, GraphNode.prototype, {
      renderLocal: function(context) {
         // Save the context
         context.save();
         
         // Fill the triangle for the tail
         context.fillStyle = "#888";
         context.fill(this.drawPath);
         
         // Add a stroke around the triangle
         context.strokeStyle = "#fff";
         context.lineWidth = 1;
         context.stroke(this.drawPath);
         
         // Restore the context
         context.restore();
      }
   });



   /**
    * FireNode is a child of the tail node, representing the fire at the end of the spaceship.
    */
   var FireNode = function() {
      GraphNode.apply(this, arguments);
      
      // Override the local bounding box of this node
      this.localBoundingBox = {
         x: -20,
         y: -0,
         w: 40,
         h: 30
      };
      
      // Set this node to be visible or not
      this.isVisible = false;
      
      // Fire cycle parameters
      this.t1 = 0;
      this.t2 = 0;
      this.t3 = 0;
   }
   _.extend(FireNode.prototype, GraphNode.prototype, {
      renderLocal: function(context) {
         if (this.isVisible) {
            // Save the context
            context.save();
            
            // Fill the 3 triangles
            context.fillStyle = 'hsl(' + (13 + 13 * Math.sin(this.t1)) + ', 100%, 50%)';
            context.fillRect(-16, 2, 8, 15 + (8 * Math.sin(this.t1)));
            
            context.fillStyle = 'hsl(' + (13 + 13 *Math.cos(this.t2)) + ', 100%, 50%)';
            context.fillRect( -4, 2, 8, 21 + (7 *  Math.cos(this.t2)));
            
            context.fillStyle = 'hsl(' + (13 + 13 * Math.sin(this.t3)) + ', 100%, 50%)';
            context.fillRect(  8, 2, 8, 17 + (8 * Math.cos(this.t3)));
            
            // Increment the fire cycle parameters
            this.t1 += Math.PI / 12 * Math.random();
            this.t2 += Math.PI / 20 * Math.random();
            this.t3 += Math.PI / 12 * Math.random();
            
            this.t1 %= 2 * Math.PI;
            this.t2 %= 2 * Math.PI;
            this.t3 %= 2 * Math.PI;
            
            // Restore the context
            context.restore();
         }
      },
      
      /**
       * Make this node visible or not
       */
      setVisible: function(visible) {
         this.isVisible = visible;
         
         this.notify();
      }
   });



   /**
    * BodyNode is a child of the spaceship node, representing the body of the spaceship.
    */ 
   var BodyNode = function() {
      GraphNode.apply(this, arguments);
      
      // BodyNode is interactable
      this.isInteractableWithMouse = true;
      
      // Override the local bounding box of this node
      this.localBoundingBox = {
         x: -15,
         y: -120,
         w: 30,
         h: 120
      };
      
      // The minimum and maximum height of the body
      this.MIN_HEIGHT = 55;
      this.MAX_HEIGHT = 400;
   }
   _.extend(BodyNode.prototype, GraphNode.prototype, {
      renderLocal: function(context) {
         // Save the context
         context.save();
         
         // Fill the body rect
         context.fillStyle = "#ccc";
         context.fillRect(
            this.localBoundingBox.x,
            this.localBoundingBox.y,
            this.localBoundingBox.w,
            this.localBoundingBox.h
         );
         
         // Add a stroke around the body rect
         context.strokeStyle = "#fff";
         context.lineWidth = 1;
         context.strokeRect(
            this.localBoundingBox.x,
            this.localBoundingBox.y,
            this.localBoundingBox.w,
            this.localBoundingBox.h
         );
         
         // Restore the context
         context.restore();
      },
      
      /**
       * Attempts to resize the BodyNode.
       * 
       * @param requestAmount: Amount by which to resize the BodyNode
       * 
       * @return Actual amount resized
       */
      resize: function(requestAmount) {
         // Calculate how much we can actually resize
         var actualResizeAmount;
         if (requestAmount < 0) {
            actualResizeAmount =
               this.localBoundingBox.h + requestAmount < this.MIN_HEIGHT
               ? this.localBoundingBox.h - this.MIN_HEIGHT
               : requestAmount;
         }
         else { // if (requestAmount >= 0)
            actualResizeAmount =
               this.localBoundingBox.h + requestAmount > this.MAX_HEIGHT
               ? this.MAX_HEIGHT - this.localBoundingBox.h
               : requestAmount;
         }
         
         // console.log('BodyNode.resize: requestAmount = ' + requestAmount + ' => actualResizeAmount = ' + actualResizeAmount);
         
         // Adjust the localBoundingBox of the BodyNode
         this.localBoundingBox.h += actualResizeAmount;
         this.localBoundingBox.y -= actualResizeAmount;
         
         // Notify the view to redraw
         this.notify();
         
         // Return the actual amount resized
         return actualResizeAmount;
      }
   });



   /**
    * HandleNode is a child of the body node, representing the resizing handle of the spaceship.
    */ 
   var HandleNode = function() {
      GraphNode.apply(this, arguments);
      
      // HandleNode is interactable
      this.isInteractableWithMouse = true;
      
      // Override the local bounding box of this node
      this.localBoundingBox = {
         x: -15,
         y: 0,
         w: 30,
         h: 6
      };
   }
   _.extend(HandleNode.prototype, GraphNode.prototype, {
      renderLocal: function(context) {
         // Save the context
         context.save();
         
         // Fill the handle rect
         context.fillStyle = "#333";
         context.fillRect(
            this.localBoundingBox.x,
            this.localBoundingBox.y,
            this.localBoundingBox.w,
            this.localBoundingBox.h
         );
         
         // Add a stroke around the handle rect
         context.strokeStyle = "#fff";
         context.lineWidth = 1;
         context.strokeRect(
            this.localBoundingBox.x,
            this.localBoundingBox.y,
            this.localBoundingBox.w,
            this.localBoundingBox.h
         );
         
         // Restore the context
         context.restore();
      }
   });
   
   
   /**
    * PortholeNode is a child of the body node, representing a window on the ship's body.
    */
   var PortholeNode = function() {
      GraphNode.apply(this, arguments);
      
      // Override the local bounding box of this node
      this.localBoundingBox = {
         x: -10,
         y: -10,
         w: 20,
         h: 20
      };
      
      // Create the local draw path
      this.drawPath = new Path2D();
      this.drawPath.arc(
         /* x             */ 0,
         /* y             */ 0,
         /* radius        */ this.localBoundingBox.w / 2,
         /* startAngle    */ 0,
         /* endAngle      */ 2 * Math.PI,
         /* anticlockwise */ false
      );
      this.drawPath.closePath();
   };
   
   _.extend(PortholeNode.prototype, GraphNode.prototype, {
      renderLocal: function(context) {
         // Save the context
         context.save();
         
         // Fill the porthole
         context.fillStyle = "#00BAFB";
         context.fill(this.drawPath);
         
         // Add a stroke around the porthole
         context.strokeStyle = "#0091CE";
         context.lineWidth = 2;
         context.stroke(this.drawPath);
         
         // Restore the context
         context.restore();
      }
   });


   // Return an object containing all of our classes and constants
   return {
      RootNode: RootNode,
      StarNode: StarNode,
      StatusNode: StatusNode,
      SpaceshipNode: SpaceshipNode,
      HeadNode: HeadNode,
      TailNode: TailNode,
      FireNode: FireNode,
      BodyNode: BodyNode,
      HandleNode: HandleNode,
      PortholeNode: PortholeNode,
   };
}