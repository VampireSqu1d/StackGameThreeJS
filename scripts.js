//importamos las librerias threeJs para los render 3D y cannonJs para las fisicas 
import * as THREE from 'three';
import * as CANNON from 'cannon';

//hacemos focus en la pantalla
window.focus();
//creamos constantes de control del juego
let camera, scene, renderer;// objetos de threeJs
let world;
const originalBoxSize = 3;
const boxHeight = 1;
let stack = [];
let overhangs = [];
let score = 0;
let speed = 0.13;
//let pauseButton = document.getElementById("pausa");
//let optionsMenu = document.getElementById("optionsMenu");
let resetButton = document.getElementById("reset")
//labels 
let tapLabel = document.getElementById("tapLabel");
let scoreElement = document.getElementById("score"); //label para la puntuacion

let htmlCanvas;//canvas (se inicializa dentro de la funcion init)

//botones del volumen
let volumeButton = document.getElementById("volume");
let mutedButton = document.getElementById("volumeMuted");
//sonidos del juego
let gameMusic = document.getElementById("gameSound");
let tapSound = document.getElementById("tapSound");
let buttonSound = document.getElementById("buttonSound");
let gameOverSound = document.getElementById("gameOver");
let perfectSound = document.getElementById("perfect");


//estados del juego
let gameStarted = false;
let gameEnded = false;
//variables para el tamaño de la camara y canvas
let width, aspect, height;

gameMusic.play();
gameMusic.volume = 0.8;
gameMusic.loop = true;


function init(){
    //inicializamos el mundo de cannon para las fisicas
    world = new CANNON.World();
    world.gravity.set(0, -12, 0);
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 40;

    scene = new THREE.Scene();
    //Foundation (caja que no se mueve)
    addLayer(0,0, originalBoxSize, originalBoxSize);
    //Primera capa (primer caja movible)
    addLayer(-10,0, originalBoxSize, originalBoxSize, "x");
    //set up lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(10,20,0);
    scene.add(directionalLight);

    //camera
    aspect = window.innerWidth / window.innerHeight;
    if (aspect < 0.7) {
        width = 8;
    } else {
        width = 20;
    }    
    height = width / aspect;

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
    renderer = new THREE.WebGLRenderer( { antialias: true} );
    renderer.domElement.id = "scene"
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio( window.devicePixelRatio -(window.devicePixelRatio * .18));
    renderer.render(scene, camera);


    document.body.appendChild(renderer.domElement);
    htmlCanvas = document.getElementById("scene");
    
}

//corremos la funcion init al cargar la escena Threejs y crear el mundo de Cannon
init();


//añade una nueva al stack caja toma como parametros la posision de la caja el tamaño y direccion
function addLayer(x, z, width, depth, direction) {
    const y = boxHeight * stack.length;
    const layer = generateBox(x,y,z, width, depth, false);
    layer.direction = direction;
    stack.push(layer);
}

/*
    esta funcion genera una Boxgeometry en threeJs con los parametros dados
    le da material, color y una mesh y la añade a la scena,
    despues crea la caja en cannonJs del mismo tamaño de la mesh de Threejs
    y la añade al mundo CannonJs creado
    se usa para generar la caja principal de cada capa y el reciduo(overhang)
*/

function generateBox(x, y, z, width, depth, falls) {
    //ThreeJs
    const geometry = new THREE.BoxGeometry(width, boxHeight, depth);
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
    //se genera el overhang con generateBox y se empuja al arreglo overhangs
    const y = boxHeight * (stack.length - 1);
    const overhang = generateBox(x,y,z, overhangWidth, overhangDepth, true);
    overhangs.push(overhang);
}

//añadimos un event listener para cuando cambie el tamaño de la pantalla
window.addEventListener('resize', () => {
    console.log("entra al listener");
    resizeCanvas();
}, false);


// click listener del boton de opciones para mostrar el menu de opciones
/*pauseButton.addEventListener("click", () => {
    console.log("entro al listener de opciones");
    optionsMenu.classList.toggle("show");
    /*if (optionsMenu.classList.contains("show")) {
        console.log(optionsMenu.classList.contains("show"));
        //optionsMenu.style.display = "none";
        optionsMenu.classList.remove("show");
        
    } else {
        optionsMenu.classList.add("show");
    }
    
    //optionsMenu.style.display = "flex";
});*/


// click listener del boton reset para vover a iniciar el juego
resetButton.addEventListener("click", () => {
    buttonSound.play();//ejecuta el sonido del boton
    startGame();// inicia el juego
    toggleResetButton();// esconde el boton
    htmlCanvas.click();
});

htmlCanvas.addEventListener("click", () => {
    CutAction();
});

/*  añadimos event listener para el teclado
    la tecla R para reiniciar el juejo
    la tecla espacio para jugar*/
window.addEventListener("keydown", function (event) {
    if (event.key === "R" || event.key === "r") {
        event.preventDefault();
        //renderer.setAnimationLoop(null);
        startGame();
        if (resetButton.classList.contains("show")) {
            toggleResetButton();
        }
        htmlCanvas.click();
    }
    if (event.key === " ") {
        CutAction();
    }
});


volumeButton.addEventListener("click", () => {
    toggleSound();
    volumeButton.classList.toggle("show");
    mutedButton.classList.toggle("show");
});

mutedButton.addEventListener("click", () => {
    toggleSound();
    mutedButton.classList.toggle("show");
    volumeButton.classList.toggle("show");
});

function toggleSound() {
    if (gameMusic.muted) {
        gameMusic.muted = false;
        tapSound.muted = false;
        buttonSound.muted = false;
        gameOverSound.muted = false;
        perfectSound.muted = false;
        return;
    }

    gameMusic.muted = true;
    tapSound.muted = true;
    buttonSound.muted = true;
    gameOverSound.muted = true;
    perfectSound.muted = true;
}

function resizeCanvas() {
    aspect = window.innerWidth / window.innerHeight;
    if (aspect < 0.7) {
        width = 8;
    } else {
        width = 24;
    }
    height = width / aspect;
    camera.left = width / -2;
    camera.right = width / 2;
    camera.top = height / 2;
    camera.bottom = height / -2;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio( window.devicePixelRatio -(window.devicePixelRatio * .18));

    renderer.render(scene, camera);
}

function CutAction() {
    if (!gameStarted) {
        renderer.setAnimationLoop(animation);
        tapLabel.style.display = "none"
        gameStarted = true;
    } else {
        if (!gameEnded) CallCutAndAdd();
    }
}

//falta hacer que la caja se mueva en direccion contraria si va muy lejos.
function animation(){
    //let speed = 0.15;
    const topLayer = stack[stack.length - 1];
    //console.log('posicion de top layer:' + topLayer.threejs.position[topLayer.direction])
    if (topLayer.threejs.position[topLayer.direction] <= -10.1) {
        speed = speed *-1;
    } else if (topLayer.threejs.position[topLayer.direction] >= 7.5) {
        speed = speed *-1;
    } else {
        
    }
    
    topLayer.threejs.position[topLayer.direction] += speed;
    topLayer.cannonjs.position[topLayer.direction] += speed;

    if (camera.position.y < boxHeight * (stack.length - 2) + 4 ){
        camera.position.y += speed;
    }
    
    updatePhysics();
    renderer.render(scene, camera);
}

function updatePhysics() {
    //esta funcion es para que caigan todos los overhangs
    world.step(1/50);

    overhangs.forEach((element) => {
       element.threejs.position.copy(element.cannonjs.position);
       element.threejs.quaternion.copy(element.cannonjs.quaternion);
    });
}

//recibe la caja en la toplayer, el tamaño del overlap, el tamaño de la caja y la diferencia del tamaño 
function cutBox(topLayer, overlap, size, delta) {
    const direction = topLayer.direction;
    //if the direction is x the new width is the overlap
    //ternary operator->  condition ? exprIfTrue : exprIfFalse
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
}

/*  esta funcion reinicia el juego
    reinicia la puntuacion y demas variables de estado
    remueve los objetos de los mundos */ 
function startGame () {
    stack = [];
    overhangs = [];
    gameStarted = false;
    gameEnded = false;
    scoreElement.innerText = "0";
    score = 0;

    
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
    // get las ultimas cajas para comparacion
    let topLayer = stack[stack.length - 1];//current moving box
    let previousLayer = stack[stack.length - 2];
    const direction = topLayer.direction;

    //delta es la diferencia de la capa mas alta(capa actual) con la capa anterior
    const delta = topLayer.threejs.position[direction] - previousLayer.threejs.position[direction];
    const  overhangSize = Math.abs(delta);// tamaño de la parte que no hace overlap
    //console.log('overhang ratio to top layer size:' +overhangSize);
    const size = direction === "x" ? topLayer.width : topLayer.depth;// get tamaño de la caja
    // tamaño del overlap es el tamaño de la caja menos la parte de que no hace overlap
    const overlap = size - overhangSize;

    if (overlap > 0) {// se ejecuta solo si hay overlap de la capa actual con la anterior
        console.log("width:" + topLayer.width);
        console.log("depth:" + topLayer.depth);
        if (overhangSize <= 0.18 ) {// se ejecuta si el margen de error es bajo
            perfectSound.play();
            // cut current box 
            topLayer.threejs.position.z = previousLayer.threejs.position.z;
            topLayer.threejs.position.x = previousLayer.threejs.position.x;
            
            score = score + 2;
            if (scoreElement) scoreElement.innerText = score;
            //add next layer of playable box to scene
            //addLayer(nextX, nextZ, newWidth, newDepth, nextDirection);
            
        } else {

            tapSound.play()//play sound for cut 
            cutBox(topLayer, overlap, size, delta);// cut current playing box
            // a partir de aaqui se calcula el Overhang y despues se llama a la funcion addOverhang
            const overhangShift = (overlap / 2 + overhangSize / 2) * Math.sign(delta);
            //coordenate x for overhang
            const overhangX =
                direction === "x"
                    ? topLayer.threejs.position.x + overhangShift
                    : topLayer.threejs.position.x;
            //coordenate z for overhang
            const overhangZ =
                direction === "z"
                    ? topLayer.threejs.position.z + overhangShift
                    : topLayer.threejs.position.z;
            const overhangWidth = direction === "x" ? overhangSize : topLayer.width;
            const overhangDepth = direction === "z" ? overhangSize : topLayer.depth;

            addOverhang(overhangX, overhangZ, overhangWidth, overhangDepth);
            
            //update score and label
            score++;
            if (scoreElement) scoreElement.innerText = score;
        }

        // Next layer
        const nextX = direction === "x" ? topLayer.threejs.position.x : -10;// posistion de la capa al aparecer
        const nextZ = direction === "z" ? topLayer.threejs.position.z : -10;// posistion de la capa al aparecer
        const newWidth = topLayer.width; // New layer has the same size as the cut top layer
        const newDepth = topLayer.depth; // New layer has the same size as the cut top layer
        const nextDirection = direction === "x" ? "z" : "x";

        addLayer(nextX, nextZ, newWidth, newDepth, nextDirection);
        return;
    } 

    // aqui se tiene que hacer que caiga la caja cuando
    // no haya overlap y terminar el juego
    // esta funcion solo se ejecuta sino se entra al if de overlap
    // esto es un game over
    gameOver();
    
}

function gameOver(){
    noOverlap();
    gameOverSound.play();
    gameEnded = true;
    toggleResetButton();
    camera.position.set(3,stack.length * 1.1 ,3);
    camera.lookAt(0,-1,0);
}

function toggleResetButton() {
    resetButton.classList.toggle("show");
}

