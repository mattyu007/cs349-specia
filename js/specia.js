/***
 * Scaffolded by Jingjie (Vincent) Zheng on June 24, 2015.
 */
 
"use strict";

// This should be your main point of entry for your app
var sceneGraphModule = createSceneGraphModule();

window.addEventListener('load', function() {
  // Create model and view modules.
  var modelModule = createModelModule();
  var viewModule = createViewModule();

  // Instantiate a spaceship model.
  var model = new modelModule.SpaceshipModel();

  // Obtain the canvas object.
  var canvas = document.getElementById('canvas');

  // Instantiate a spaceship view with the model and the canvas.
  var view = viewModule.SpaceshipView(model, canvas);
  
  // // Get the background audio control
  // var audioControl = document.getElementById('sp-bg-audio');
  
  // // Play in a loop
  // audioControl.loop = true;
  // audioControl.play();
});