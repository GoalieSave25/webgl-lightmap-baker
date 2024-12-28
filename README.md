# WebGL Lightmap Baker
![neongithub](https://github.com/user-attachments/assets/def7b4bb-12dc-4b87-8888-a6330eef599b)

Bake shadows, ambient occlusion, and point lights for your 3d scenes to increase visual fidelity and performance!  
Made for and used in the production pipeline for https://deadshot.io/  
  
### Installation:  
npm install  
npm start  
  
  
### Keybinds:  
space - Toggle lightmap view / combined view  
i - Toggle UI  
o - Toggle backfaces  
v - Camera up  
c - Camera down  
u - Export light settings to console  
b - Import light settings  
backspace - delete light  
  
  
### Other Notes:  
After clicking "Add Light", must click to place light  
Not using orbitcontrols, middle/right click to rotate, shift + middle/right click to pan  
Left click to select light  
  
  
### To view minimal import example/use in your project:  
Check "Need Export" box  
Bake  
Save the top left image to output/lightmap.png  
Move the exported gioutput.gltf to output/gioutput.gltf  
View /example.html in browser  
  
  
### Thanks to:  
xatlas/xatlas-three for UV unwrapping  
https://github.com/jpcy/xatlas  
https://github.com/repalash/xatlas-three  
  
three-mesh-bvh for software raytracing  
https://github.com/gkjohnson/three-mesh-bvh  
  
three.js for rendering n stuff  
https://github.com/mrdoob/three.js
