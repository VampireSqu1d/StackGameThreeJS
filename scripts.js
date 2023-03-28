import * as THREE from 'three';
import * as CANNON from 'cannon';

window.focus();
let camera, scene, renderer;
let world;
const originalBoxSize = 3;
const boxHeight = 1;
let stack = [];
let scoreElement = document.getElementById("score");
let overhangs = [];
let gameStarted = false;
let gameEnded = false;

function init(){
    world = new CANNON.World();
    world.gravity.set(0, -12, 0);
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 40;

    scene = new THREE.Scene();
    //Foundation
    addLayer(0,0, originalBoxSize, originalBoxSize);
    //Primera capa
    addLayer(-10,0, originalBoxSize, originalBoxSize, "x");
    //set up lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(10,20,0);
    scene.add(directionalLight);

    //camera
    const aspect = window.innerWidth / window.innerHeight;
    const width = 29;
    const height = width / aspect;

    camera = new THREE.OrthographicCamera(
        width / -2, // left
        width / 2, // right
        height / 2, // top
        height / -2, // bottom
        0, // near plane
        100 // far plane
    );

    camera.position.set(4,4,4);
    camera.lookAt(0,0,0);

    //renderer
    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.render(scene, camera);

    document.body.appendChild(renderer.domElement);
}

init();

function addLayer(x, z, width, depth, direction) {
    const y = boxHeight * stack.length;
    const layer = generateBox(x,y,z, width, depth, false);
    layer.direction = direction;
    stack.push(layer);
}

function generateBox(x, y, z, width, depth, falls) {
    //ThreeJs
    const geometry = new THREE.BoxGeometry(width, boxHeight,depth);
    const color = new THREE.Color(`hsl(${30 + stack.length * 4}, 100%, 50%)`);
    const material = new THREE.MeshLambertMaterial({color: color});
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x,y,z);
    scene.add(mesh);
    //CannonJs
    const shape = new CANNON.Box(
        new CANNON.Vec3(width / 2, boxHeight /2, depth / 2)
    );
    let mass = falls ? 5 : 0;
    mass *= width /originalBoxSize;
    mass *= depth /originalBoxSize;
    const body = new CANNON.Body({mass, shape});
    body.position.set(x,y,z);
    world.addBody(body);

    return {
        threejs: mesh,
        cannonjs: body,
        width,
        depth
    };
}

function addOverhang(x, z, overhangWidth, overhangDepth) {
    const y = boxHeight * (stack.length - 1);
    const overhang = generateBox(x,y,z, overhangWidth, overhangDepth, true);
    overhangs.push(overhang);
}

window.addEventListener("click", () => {
    if (!gameStarted){
        renderer.setAnimationLoop(animation);
        gameStarted = true;
    } else {
        if (!gameEnded) CallCutAndAdd();
        }
});

window.addEventListener("keydown", function (event) {
    if (event.key === "R" || event.key === "r") {
        event.preventDefault();
        //renderer.setAnimationLoop(null);
        startGame();
    }
    if (event.key === " ") {
        if (!gameStarted){
            renderer.setAnimationLoop(animation);
            gameStarted = true;
        } else {
            if (!gameEnded) CallCutAndAdd();
        }
    }
    });

function animation(){
    const speed = 0.15;
    const topLayer = stack[stack.length - 1];

    topLayer.threejs.position[topLayer.direction] += speed;
    topLayer.cannonjs.position[topLayer.direction] += speed;

    if (camera.position.y < boxHeight * (stack.length - 2) + 4 ){
        camera.position.y += speed;
    }
    updatePhysics();
    renderer.render(scene, camera);
}

function cutBox(topLayer, overlap, size, delta) {
    const direction = topLayer.direction;
    const newWidth = direction === "x" ? overlap : topLayer.width;
    const newDepth = direction === "z" ? overlap : topLayer.depth;
    //update metadata
    topLayer.width = newWidth;
    topLayer.depth = newDepth;
    //update ThreeJS model
    topLayer.threejs.scale[direction] = overlap / size;
    topLayer.threejs.position[direction] -= delta /2;
    //update CannonJs model
    topLayer.cannonjs.position[direction] -= delta /2;

    const shape = new CANNON.Box(
        new CANNON.Vec3(newWidth / 2, boxHeight/2, newDepth / 2)
    );
    topLayer.cannonjs.shapes = [];
    topLayer.cannonjs.addShape(shape);
}

function updatePhysics() {
    world.step(1/50);

    overhangs.forEach((element) => {
       element.threejs.position.copy(element.cannonjs.position);
       element.threejs.quaternion.copy(element.cannonjs.quaternion);
    });
}

function noOverlap() {
    const topLayer = stack[stack.length -1];

    addOverhang(
        topLayer.threejs.position.x,
        topLayer.threejs.position.z,
        topLayer.width,
        topLayer.depth,
        );
    world.remove(topLayer.cannonjs);
    scene.remove(topLayer.threejs);

    gameEnded = true;
}

function startGame () {
    stack = [];
    overhangs = [];
    gameStarted = false;
    gameEnded = false;
    scoreElement.innerText = "0";

    if (world) {
        while (world.bodies.length > 0) {
            world.remove(world.bodies[0]);
        }
    }

    if (scene) {
        // Remove every Mesh from the scene
        while (scene.children.find((c) => c.type == "Mesh")) {
            const mesh = scene.children.find((c) => c.type == "Mesh");
            scene.remove(mesh);
        }
    }
    //renderer.setAnimationLoop(null);
    //Foundation
    addLayer(0,0, originalBoxSize, originalBoxSize);
    //Primera capa
    addLayer(-10,0, originalBoxSize, originalBoxSize, "x");

    if (camera) {
        // Reset camera positions
        camera.position.set(4, 4, 4);
        camera.lookAt(0, 0, 0);
    }

    document.body.click();
}

function CallCutAndAdd() {
    const topLayer = stack[stack.length - 1];
    const previousLayer = stack[stack.length - 2];
    const direction = topLayer.direction;

    const delta = topLayer.threejs.position[direction] - previousLayer.threejs.position[direction];
    const  overhangSize = Math.abs(delta);

    const size = direction === "x" ? topLayer.width : topLayer.depth;
    const overlap = size - overhangSize;

    if (overlap > 0) {
        cutBox(topLayer, overlap, size, delta);

        // Overhang
        const overhangShift = (overlap / 2 + overhangSize / 2) * Math.sign(delta);
        const overhangX =
            direction === "x"
                ? topLayer.threejs.position.x + overhangShift
                : topLayer.threejs.position.x;
        const overhangZ =
            direction === "z"
                ? topLayer.threejs.position.z + overhangShift
                : topLayer.threejs.position.z;
        const overhangWidth = direction === "x" ? overhangSize : topLayer.width;
        const overhangDepth = direction === "z" ? overhangSize : topLayer.depth;

        addOverhang(overhangX, overhangZ, overhangWidth, overhangDepth);

        // Next layer
        const nextX = direction === "x" ? topLayer.threejs.position.x : -10;
        const nextZ = direction === "z" ? topLayer.threejs.position.z : -10;
        const newWidth = topLayer.width; // New layer has the same size as the cut top layer
        const newDepth = topLayer.depth; // New layer has the same size as the cut top layer
        const nextDirection = direction === "x" ? "z" : "x";

        if (scoreElement) scoreElement.innerText = stack.length - 1;

        addLayer(nextX, nextZ, newWidth, newDepth, nextDirection);
    } else {
        // aqui se tiene que hacer que caiga la caja cuando
        // no haya overlap y terminar el juego
        noOverlap();
    }
}

