Laya3D.init(0, 0, true);

this._position = new Laya.Vector3(0, 0, 0);
this._upVector3 = new Laya.Vector3(0, 1, 0);
this._tarPosition = new Laya.Vector3(0, 0, 0);
this._finalPosition = new Laya.Vector3(0, 0, 0);
this._quaternion = new Laya.Quaternion();
this.index = 0;
this.curPathIndex = 0;
this.nextPathIndex = 1;
this.pointCount = 10;
Laya.stage.scaleMode = Laya.Stage.SCALE_FULL;
Laya.stage.screenMode = Laya.Stage.SCREEN_NONE;
Laya.Stat.show();

this.path = new Array();

//预加载所有资源
var resource = [
    { url: "../../res/threeDimen/scene/TerrainScene/XunLongShi.ls", clas: Laya.Scene, priority: 1 },
    { url: "../../res/threeDimen/skinModel/LayaMonkey/LayaMonkey.lh", clas: Laya.Sprite3D, priority: 1 },
    { url: "../../res/threeDimen/scene/TerrainScene/Assets/HeightMap.png", clas: Laya.Texture2D, priority: 1, params: [true] },
    { url: "../../res/threeDimen/scene/TerrainScene/Assets/AStarMap.png", clas: Laya.Texture2D, priority: 1, params: [true] }
];

Laya.loader.create(resource, Laya.Handler.create(this, onLoadFinish));
function onLoadFinish() {
    //初始化3D场景
    this.scene = Laya.stage.addChild(Laya.Scene.load("../../res/threeDimen/scene/TerrainScene/XunLongShi.ls"));

    //删除原始资源中包含的默认相机
    var camera = this.scene.getChildByName("Scenes").getChildByName("Main Camera");
    camera.removeSelf();

    var skyBox = new Laya.SkyBox();
    skyBox.textureCube = Laya.TextureCube.load("../../res/threeDimen/skyBox/skyBox3/skyCube.ltc");
    camera.sky = skyBox;

    //根据场景中方块生成路径点
    initPath(this.scene);

    //获取可行走区域模型
    var meshSprite3D = this.scene.getChildByName('Scenes').getChildByName('HeightMap');
    //使可行走区域模型隐藏
    meshSprite3D.active = false;
    var heightMap = Laya.Loader.getRes("../../res/threeDimen/scene/TerrainScene/Assets/HeightMap.png");
    //初始化MeshTerrainSprite3D
    this.terrainSprite = Laya.MeshTerrainSprite3D.createFromMeshAndHeightMap(meshSprite3D.meshFilter.sharedMesh, heightMap, 6.574996471405029, 10.000000953674316);
    //更新terrainSprite世界矩阵(为可行走区域世界矩阵)
    this.terrainSprite.transform.worldMatrix = meshSprite3D.transform.worldMatrix;

    //给terrainSprite添加PathFind组件
    var pathFingding = this.terrainSprite.addComponent(Laya.PathFind);
    pathFingding.setting = { allowDiagonal: true, dontCrossCorners: false, heuristic: PathFinding.core.Heuristic.manhattan, weight: 1 };
    var aStarMap = Laya.Loader.getRes("../../res/threeDimen/scene/TerrainScene/Assets/AStarMap.png");
    pathFingding.grid = PathFinding.core.Grid.createGridFromAStarMap(aStarMap);

    //初始化移动单元
    this.moveSprite3D = this.scene.addChild(new Laya.Sprite3D());
    this.moveSprite3D.transform.position = this.path[0];

    //初始化小猴子
    this.layaMonkey = this.moveSprite3D.addChild(Laya.Sprite3D.load("../../res/threeDimen/skinModel/LayaMonkey/LayaMonkey.lh"));
    this.layaMonkey.transform.localScale = new Laya.Vector3(5, 5, 5);
    var animator = (this.layaMonkey.getChildAt(0)).getComponentByType(Laya.Animator);
    var totalAnimationClip = animator.getClip("Take_001");
    animator.addClip(totalAnimationClip, "walk", 40, 70);
    animator.play("walk", 2.5);

    //初始化相机
    var moveCamera = this.moveSprite3D.addChild(new Laya.Camera());
    moveCamera.addComponent(CameraMoveScript);
    moveCamera.transform.localPosition = new Laya.Vector3(0, 7, -7);
    moveCamera.transform.rotate(new Laya.Vector3(-45, 180, 0), true, false);

    Laya.stage.on(Laya.Event.MOUSE_UP, this, function () {
        this.index = 0;
        //获取每次生成路径
        this._everyPath = pathFingding.findPath(this.path[this.curPathIndex % this.pointCount].x, this.path[this.curPathIndex++ % this.pointCount].z,
            this.path[this.nextPathIndex % this.pointCount].x, this.path[this.nextPathIndex++ % this.pointCount].z);
    });

    Laya.timer.loop(40, this, loopfun);
}

function loopfun() {
    if (this._everyPath && this.index < this._everyPath.length) {
        //AStar寻路位置
        this._position.x = this._everyPath[this.index][0];
        this._position.z = this._everyPath[this.index++][1];
        //HeightMap获取高度数据
        this._position.y = this.terrainSprite.getHeight(this._position.x, this._position.z);
        if (isNaN(this._position.y)) {
            this._position.y = this.moveSprite3D.transform.position.y;
        }

        this._tarPosition.x = this._position.x;
        this._tarPosition.z = this._position.z;
        this._tarPosition.y = this.moveSprite3D.transform.position.y;

        //调整方向
        this.layaMonkey.transform.lookAt(this._tarPosition, this._upVector3, false);
        //因为资源规格,这里需要旋转180度
        this.layaMonkey.transform.rotate(new Laya.Vector3(0, 180, 0), false, false);
        //调整位置
        Laya.Tween.to(this._finalPosition, { x: this._position.x, y: this._position.y, z: this._position.z }, 40);
        this.moveSprite3D.transform.position = this._finalPosition;
    }
}

function initPath(scene) {
    for (var i = 0; i < this.pointCount; i++) {
        var str = "path" + i;
        this.path.push((scene.getChildByName('Scenes').getChildByName('Area').getChildByName(str)).transform.localPosition);
    }
}