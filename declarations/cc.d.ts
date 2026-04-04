/**
 * Cocos Creator 3.8.8 类型声明
 *
 * 注意: 这是简化的类型声明，用于编译时类型检查。
 * 完整类型定义由 Cocos Creator 编辑器自动生成。
 */

declare module 'cc' {
  // 核心装饰器
  export function ccclass(name?: string): ClassDecorator;
  export function property(options?: PropertyOptions): PropertyDecorator;
  export function executeInEditMode(mode?: string): ClassDecorator;
  export function menu(path: string): ClassDecorator;
  export function tooltip(text: string): PropertyDecorator;
  export function range(min: number, max: number, step?: number): PropertyDecorator;
  export function displayName(name: string): PropertyDecorator;
  export function readonly(): PropertyDecorator;
  export function writable(): PropertyDecorator;

  export interface PropertyOptions {
    type?: any;
    visible?: boolean | (() => boolean);
    displayName?: string;
    tooltip?: string;
    min?: number;
    max?: number;
    step?: number;
    range?: [number, number, number?];
    readonly?: boolean;
    writable?: boolean;
    serializable?: boolean;
    formerlySerializedAs?: string;
    override?: boolean;
    editorOnly?: boolean;
    default?: any;
    multiline?: boolean;
    multiline?: boolean;
    multiline?: boolean;
  }

  // 核心类
  export class Component {
    node: Node;
    name: string;
    enabled: boolean;
    enabledInHierarchy: boolean;
    isValid: boolean;

    onLoad(): void;
    start?(): void;
    onEnable?(): void;
    onDisable?(): void;
    onDestroy(): void;
    update?(dt: number): void;
    lateUpdate?(dt: number): void;
    __preload?(): void;

    schedule(callback: Function, interval: number, repeat?: number, delay?: number): void;
    scheduleOnce(callback: Function, delay: number): void;
    unschedule(callback: Function): void;
    unscheduleAllCallbacks(): void;

    getComponent<T extends Component>(type: new (...: any[]) => T): T | null;
    getComponent<T extends Component>(type: string): T | null;
    getComponents<T extends Component>(type: new (...: any[]) => T): T[];
    getComponentInChildren<T extends Component>(type: new (...: any[]) => T): T | null;
    getComponentsInChildren<T extends Component>(type: new (...: any[]) => T): T[];

    static findComponent<T extends Component>(node: Node, type: new (...: any[]) => T): T | null;
    static findComponents<T extends Component>(node: Node, type: new (...: any[]) => T): T[];
  }

  export class Node {
    name: string;
    uuid: string;
    active: boolean;
    activeInHierarchy: boolean;
    parent: Node | null;
    children: Node[];
    scene: Scene | null;
    isValid: boolean;
    position: Vec3;
    worldPosition: Vec3;
    rotation: Quat;
    scale: Vec3;
    eulerAngles: Vec3;

    constructor(name?: string);

    addChild(child: Node): void;
    removeChild(child: Node): void;
    removeFromParent(): void;
    destroy(): void;
    getComponent<T extends Component>(type: new (...: any[]) => T): T | null;
    getComponents<T extends Component>(type: new (...: any[]) => T): T[];
    getChildByPath(path: string): Node | null;
    getChildByName(name: string): Node | null;
    getChild(index: number): Node;
    emit(type: string, ...args: any[]): void;
    on(type: string, callback: Function, target?: any): void;
    once(type: string, callback: Function, target?: any): void;
    off(type: string, callback?: Function, target?: any): void;
    targetOff(target: any): void;
    setSiblingIndex(index: number): void;
  }

  export class Scene extends Node {
    name: string;
    nodes: Node[];

    constructor(name?: string);
  }

  // 数学类型
  export class Vec3 {
    x: number;
    y: number;
    z: number;
    constructor(x?: number, y?: number, z?: number);
    static readonly ZERO: Vec3;
    static readonly ONE: Vec3;
    static readonly UNIT_X: Vec3;
    static readonly UNIT_Y: Vec3;
    static readonly UNIT_Z: Vec3;
    set(x: number, y: number, z: number): Vec3;
    clone(): Vec3;
    add(other: Vec3): Vec3;
    subtract(other: Vec3): Vec3;
    multiply(other: Vec3): Vec3;
    normalize(): Vec3;
    length(): number;
    lengthSqr(): number;
    static equals(a: Vec3, b: Vec3, epsilon?: number): boolean;
    static distance(a: Vec3, b: Vec3): number;
    static lerp(out: Vec3, a: Vec3, b: Vec3, t: number): Vec3;
  }

  export class Vec2 {
    x: number;
    y: number;
    constructor(x?: number, y?: number);
    static readonly ZERO: Vec2;
    static readonly ONE: Vec2;
    set(x: number, y: number): Vec2;
    clone(): Vec2;
  }

  export class Quat {
    x: number;
    y: number;
    z: number;
    w: number;
    constructor(x?: number, y?: number, z?: number, w?: number);
    static fromEuler(out: Quat, x: number, y: number, z: number): Quat;
  }

  export class Color {
    r: number;
    g: number;
    b: number;
    a: number;
    constructor(r?: number, g?: number, b?: number, a?: number);
    static readonly WHITE: Color;
    static readonly BLACK: Color;
    static readonly RED: Color;
    static readonly GREEN: Color;
    static readonly BLUE: Color;
    static readonly YELLOW: Color;
    static readonly TRANSPARENT: Color;
    set(r: number, g: number, b: number, a?: number): Color;
    clone(): Color;
  }

  // 2D 组件
  export class UITransform extends Component {
    contentSize: Vec2;
    anchorPoint: Vec2;
    priority: number;

    setContentSize(size: Vec2 | number, height?: number): void;
    setAnchorPoint(point: Vec2 | number, y?: number): void;
    getBoundingBox(): { x: number; y: number; width: number; height: number };
    convertToWorldSpaceAR(point: Vec2): Vec2;
    convertToNodeSpaceAR(point: Vec2): Vec2;
  }

  export class Sprite extends Component {
    spriteFrame: SpriteFrame | null;
    color: Color;
    type: SpriteType;
    sizeMode: SizeMode;
    trim: boolean;

    static SpriteType: typeof SpriteType;
    static SizeMode: typeof SizeMode;
  }

  export type SpriteType = 'SIMPLE' | 'SLICED' | 'TILED' | 'FILLED';
  export type SizeMode = 'CUSTOM' | 'TRIMMED' | 'RAW';

  export class Label extends Component {
    string: string;
    horizontalAlign: HorizontalTextAlignment;
    verticalAlign: VerticalTextAlignment;
    fontSize: number;
    lineHeight: number;
    overflow: Overflow;
    enableWrapText: boolean;
    font: Font | null;
    color: Color;
    useSystemFont: boolean;
  }

  export type HorizontalTextAlignment = 'LEFT' | 'CENTER' | 'RIGHT';
  export type VerticalTextAlignment = 'TOP' | 'CENTER' | 'BOTTOM';
  export type Overflow = 'NONE' | 'CLAMP' | 'SHRINK' | 'RESIZE_HEIGHT';

  export class Button extends Component {
    interactable: boolean;
    transition: Transition;
    target: Node | null;
    clickEvents: EventHandler[];
    normalColor: Color;
    pressedColor: Color;
    hoverColor: Color;
    disabledColor: Color;
    normalSprite: SpriteFrame | null;
    pressedSprite: SpriteFrame | null;
    hoverSprite: SpriteFrame | null;
    disabledSprite: SpriteFrame | null;
    duration: number;
  }

  export type Transition = 'NONE' | 'COLOR' | 'SPRITE';

  export interface EventHandler {
    target: Node | null;
    component: string;
    handler: string;
    customEventData: string;
  }

  export class ProgressBar extends Component {
    progress: number;
    barSprite: Sprite | null;
    mode: Mode;
    reverse: boolean;
    totalLength: number;
  }

  export type Mode = 'FILLED' | 'HORIZONTAL' | 'VERTICAL';

  export class Layout extends Component {
    type: Type;
    resizeMode: ResizeMode;
    horizontalDirection: HorizontalDirection;
    verticalDirection: VerticalDirection;
    cellSize: Vec2;
    startAxis: AxisDirection;
    paddingLeft: number;
    paddingRight: number;
    paddingTop: number;
    paddingBottom: number;
    spacingX: number;
    spacingY: number;
    constraint: Constraint;
    constraintNum: number;
    affectedByScale: boolean;
    autoResize: boolean;
  }

  export type Type = 'NONE' | 'HORIZONTAL' | 'VERTICAL' | 'GRID';
  export type ResizeMode = 'NONE' | 'CHILDREN' | 'CONTAINER';
  export type HorizontalDirection = 'LEFT_TO_RIGHT' | 'RIGHT_TO_LEFT';
  export type VerticalDirection = 'TOP_TO_BOTTOM' | 'BOTTOM_TO_TOP';
  export type AxisDirection = 'HORIZONTAL' | 'VERTICAL';
  export type Constraint = 'NONE' | 'FIXED_ROW' | 'FIXED_COL';

  export class ScrollView extends Component {
    content: Node | null;
    horizontal: boolean;
    vertical: boolean;
    inertia: boolean;
    brake: number;
    elastic: boolean;
    bounceDuration: number;
    horizontalScrollBar:ScrollBar | null;
    verticalScrollBar: ScrollBar | null;
    scrollEvents: EventHandler[];
    cancelInnerEvents: boolean;

    scrollToBottom(timeInSecond?: number, attenuated?: boolean): void;
    scrollToTop(timeInSecond?: number, attenuated?: boolean): void;
    scrollToLeft(timeInSecond?: number, attenuated?: number): void;
    scrollToRight(timeInSecond?: number, attenuated?: number): void;
    scrollToOffset(offset: Vec2, timeInSecond?: number, attenuated?: boolean): void;
    getScrollOffset(): Vec2;
    getMaxScrollOffset(): Vec2;
    stopAutoScroll(): void;
  }

  export class ScrollBar extends Component {}

  export class Mask extends Component {
    type: MaskType;
    spriteFrame: SpriteFrame | null;
    inverted: boolean;
    segments: number;
  }

  export type MaskType = 'RECT' | 'ELLIPSE' | 'IMAGE_STENCIL';

  export class Widget extends Component {
    isAlignTop: boolean;
    isAlignBottom: boolean;
    isAlignLeft: boolean;
    isAlignRight: boolean;
    isAlignHorizontalCenter: boolean;
    isAlignVerticalCenter: boolean;
    top: number;
    bottom: number;
    left: number;
    right: number;
    horizontalCenter: number;
    verticalCenter: number;
    target: Node | null;
    alignMode: AlignMode;
  }

  export type AlignMode = 'ALWAYS' | 'ONCE' | 'ON_WINDOW_RESIZE';

  export class Canvas extends Component {
    cameraComponent: Camera | null;
    alignCanvasWithScreen: boolean;
  }

  // 资源类型
  export class Asset {
    name: string;
    isValid: boolean;
    constructor();
  }

  export class SpriteFrame extends Asset {
    texture: Texture2D | null;
    rect: { x: number; y: number; width: number; height: number };
    offset: Vec2;
    originalSize: Vec2;
    rotated: boolean;
  }

  export class Texture2D extends Asset {
    width: number;
    height: number;
    pixelFormat: number;
    _uuid: string;
  }

  export class Font extends Asset {}

  export class AudioClip extends Asset {
    duration: number;
    _nativeAsset: any;
  }

  export class Prefab extends Asset {
    data: Node;
  }

  export class JsonAsset extends Asset {
    json: any;
  }

  export class TextAsset extends Asset {
    text: string;
  }

  // 动画
  export class Animation extends Component {
    clips: AnimationClip[];
    defaultClip: AnimationClip | null;
    playOnLoad: boolean;

    play(name?: string): AnimationState;
    stop(): void;
    pause(): void;
    resume(): void;
    setCurrentTime(time: number, name?: string): void;
    getState(name: string): AnimationState;
  }

  export class AnimationClip extends Asset {
    name: string;
    duration: number;
    speed: number;
    wrapMode: WrapMode;
  }

  export type WrapMode = 'Default' | 'Normal' | 'Once' | 'Loop' | 'PingPong' | 'Reverse';

  export interface AnimationState {
    name: string;
    duration: number;
    speed: number;
    time: number;
    wrapMode: WrapMode;
    playing: boolean;
    paused: boolean;
  }

  // 缓动
  export namespace tween {
    function <T>(target: T): Tween<T>;
    interface Tween<T> {
      to(duration: number, props: any, opts?: TweenOptions): Tween<T>;
      by(duration: number, props: any, opts?: TweenOptions): Tween<T>;
      to(worldPosition: boolean, duration: number, position: Vec3, opts?: TweenOptions): Tween<T>;
      delay(duration: number): Tween<T>;
      call(callback: Function): Tween<T>;
      hide(): Tween<T>;
      show(): Tween<T>;
      removeSelf(): Tween<T>;
      start(): Tween<T>;
      stop(): Tween<T>;
      clone(target: any): Tween<T>;
    }
    interface TweenOptions {
      easing?: string | [number, number, number, number];
      progress?: (start: number, end: number, current: number, ratio: number) => number;
      onComplete?: Function;
      onUpdate?: (target: any, ratio: number) => void;
    }
  }

  // 全局函数
  export function tween<T>(target: T): tween.Tween<T>;

  // 导演
  export namespace director {
    function loadScene(sceneName: string, onLaunched?: Function, onError?: Function): void;
    function preloadScene(sceneName: string, onProgress?: Function, onLoaded?: Function): void;
    function getScene(): Scene | null;
    function getSceneByName(name: string): Scene | null;
    function getSceneUuid(name: string): string | null;
    const root: any;
  }

  // 资源管理
  export namespace resources {
    function load<T extends Asset>(path: string, type: new (...args: any[]) => T, callback: (err: Error | null, asset: T) => void): void;
    function load<T extends Asset>(path: string, callback: (err: Error | null, asset: T) => void): void;
    function loadDir<T extends Asset>(path: string, type: new (...args: any[]) => T, callback: (err: Error | null, assets: T[]) => void): void;
    function release(asset: Asset | string): void;
    function releaseUnusedAssets(): void;
  }

  export namespace assetManager {
    function loadBundle(name: string, callback: (err: Error | null, bundle: Bundle) => void): void;
    function getBundle(name: string): Bundle | null;
    function releaseBundle(bundle: Bundle): void;
    function loadRemote<T extends Asset>(url: string, options?: any, callback?: (err: Error | null, asset: T) => void): void;

    interface Bundle {
      name: string;
      load<T extends Asset>(path: string, type: new (...args: any[]) => T, callback: (err: Error | null, asset: T) => void): void;
      release(path: string, type?: new (...args: any[]) => Asset): void;
    }
  }

  // 摄像机
  export class Camera extends Component {
    priority: number;
    visibility: number;
    clearColor: Color;
    orthoHeight: number;
    far: number;
    near: number;
    fov: number;
    projection: number;
  }

  // 输入
  export namespace input {
    namespace InputEventType {
      const TOUCH_START: string;
      const TOUCH_MOVE: string;
      const TOUCH_END: string;
      const TOUCH_CANCEL: string;
      const MOUSE_DOWN: string;
      const MOUSE_MOVE: string;
      const MOUSE_UP: string;
      const MOUSE_WHEEL: string;
      const KEY_DOWN: string;
      const KEY_PRESSING: string;
      const KEY_UP: string;
    }

    function on(type: string, callback: Function, target?: any): void;
    function off(type: string, callback?: Function, target?: any): void;
    function once(type: string, callback: Function, target?: any): void;
  }

  export class EventTouch {
    type: string;
    bubbles: boolean;
    target: Node | null;
    currentTarget: Node | null;
    eventPhase: number;
    touch: Touch | null;
    touches: Touch[];
    propagationStopped: boolean;
    propagationImmediateStopped: boolean;

    getUILocation(): Vec2;
    getUIDelta(): Vec2;
    getLocation(): Vec2;
    getDelta(): Vec2;
    getStartLocation(): Vec2;
    preventDefault(): void;
    stopPropagation(): void;
    stopPropagationImmediate(): void;
  }

  export class EventMouse {
    type: string;
    bubbles: boolean;
    target: Node | null;
    currentTarget: Node | null;
    eventPhase: number;
    button: number;
    scrollDelta: Vec2;
    propagationStopped: boolean;
    propagationImmediateStopped: boolean;

    getUILocation(): Vec2;
    getUIDelta(): Vec2;
    getLocation(): Vec2;
    getDelta(): Vec2;
    getScrollDelta(): Vec2;
    preventDefault(): void;
    stopPropagation(): void;
    stopPropagationImmediate(): void;
  }

  export class EventKeyboard {
    type: string;
    keyCode: number;
    rawKeyCode: number;
    eventPhase: number;
    propagationStopped: boolean;
    propagationImmediateStopped: boolean;

    stopPropagation(): void;
    stopPropagationImmediate(): void;
  }

  export interface Touch {
    id: number;
    location: Vec2;
    startLocation: Vec2;
    prevLocation: Vec2;
    delta: Vec2;
  }

  // 游戏循环
  export namespace game {
    const frameTime: number;
    const deltaTime: number;
    const totalTime: number;
    const timeScale: number;
    const paused: boolean;

    function pause(): void;
    function resume(): void;
    function step(): void;
    function end(): void;
    function isPaused(): boolean;

    function on(event: string, callback: Function, target?: any): void;
    function off(event: string, callback?: Function, target?: any): void;

    namespace evt {
      const GAME_INIT: string;
      const GAME_START: string;
      const GAME_PAUSE: string;
      const GAME_RESUME: string;
      const GAME_STOP: string;
    }
  }

  // 调试
  export namespace debug {
    function setDisplayStats(enabled: boolean): void;
    function isDisplayStats(): boolean;
  }

  // sys
  export namespace sys {
    interface SystemInfo {
      platform: string;
      language: string;
      nativeLanguage: string;
      os: string;
      osVersion: string;
      browserType: string;
      browserVersion: string;
      isNative: boolean;
      isMobile: boolean;
      isWeChatGame: boolean;
      networkType: string;
      pixelRatio: number;
      windowPixelResolution: { width: number; height: number };
      safeArea: { x: number; y: number; width: number; height: number };
      screenWidth: number;
      screenHeight: number;
    }

    function isObjectValid(obj: any): boolean;
    function now(): number;
    function getSystemInfo(): SystemInfo;
    function getNetworkType(): string;
    function getBatteryLevel(): number;
    function triggerGC(): void;

    namespace Platform {
      const WECHAT_GAME: string;
      const ANDROID: string;
      const IOS: string;
      const MOBILE_BROWSER: string;
      const DESKTOP_BROWSER: string;
      const WIN32: string;
      const OSX: string;
    }
  }

  // 持久化
  export namespace sys.localStorage {
    function getItem(key: string): string | null;
    function setItem(key: string, value: string): void;
    function removeItem(key: string): void;
    function clear(): void;
  }

  // 数学工具
  export namespace math {
    function clamp(value: number, min: number, max: number): number;
    function clamp01(value: number): number;
    function lerp(a: number, b: number, t: number): number;
    function toDegree(radian: number): number;
    function toRadian(degree: number): number;
    function randomRange(min: number, max: number): number;
    function randomRangeInt(min: number, max: number): number;
    function pseudoRandom(seed: number): () => number;
    function nextPow2(n: number): number;
  }

  // 碰撞
  export namespace Collider2D {
    const Box: any;
    const Circle: any;
    const Polygon: any;
  }

  export class Collider2D extends Component {
    sensor: boolean;
    density: number;
    friction: number;
    restitution: number;
    mask: number;
    group: number;
    category: number;
  }

  export class BoxCollider2D extends Collider2D {
    size: Vec2;
    offset: Vec2;
  }

  export class CircleCollider2D extends Collider2D {
    radius: number;
    offset: Vec2;
  }

  export class RigidBody2D extends Component {
    enabledContactListener: boolean;
    bullet: boolean;
    awakeOnLoad: boolean;
    linearDamping: number;
    angularDamping: number;
    linearVelocity: Vec2;
    angularVelocity: number;
    fixedRotation: boolean;
    sleepingAllowed: boolean;
    gravityScale: number;
    type: RigidBodyType;

    applyForce(force: Vec2, point?: Vec2): void;
    applyForceToCenter(force: Vec2): void;
    applyTorque(torque: number): void;
    applyLinearImpulse(impulse: Vec2, point?: Vec2): void;
    applyLinearImpulseToCenter(impulse: Vec2): void;
    applyAngularImpulse(impulse: number): void;
    getLocalVector(worldVector: Vec2): Vec2;
    getWorldVector(localVector: Vec2): Vec2;
    getLocalPoint(worldPoint: Vec2): Vec2;
    getWorldPoint(localPoint: Vec2): Vec2;
    getLocalCenter(): Vec2;
    getWorldCenter(): Vec2;
    getMass(): number;
    getInertia(): number;
    getJointList(): unknown[];
    isAwake(): boolean;
    sleep(): void;
    wakeUp(): void;
    isActive(): boolean;
    setActive(flag: boolean): void;
    getType(): RigidBodyType;
    setType(type: RigidBodyType): void;
  }

  export type RigidBodyType = 'Static' | 'Kinematic' | 'Dynamic';

  export interface IPhysics2DContact {
    collider: Collider2D;
    otherCollider: Collider2D;
    world: any;
    self: any;
    other: any;
    contactCount: number;
    getWorldManifold(): { normal: Vec2; points: Vec2[] };
    getManifold(): { normal: Vec2; points: { localPoint: Vec2 }[] };
    setEnabled(enabled: boolean): void;
    isEnabled(): boolean;
  }

  export namespace PhysicsSystem2D {
    const instance: PhysicsSystem2DInstance;
  }

  export interface PhysicsSystem2DInstance {
    enable?: boolean;
    gravity: Vec2;
    allowSleep: boolean;
    timeScale: number;
    fixedTimeStep: number;
    velocityIterations: number;
    positionIterations: number;
    on(event: string, callback: Function, target?: any): void;
    off(event: string, callback?: Function, target?: any): void;
    raycast(p1: Vec2, p2: Vec2, type?: string, detector?: (collider: Collider2D) => boolean): PhysicsRayResult[];
    testAABB(rect: { x: number; y: number; width: number; height: number }): Collider2D[];
    testPoint(p: Vec2): Collider2D[];
  }

  export interface PhysicsRayResult {
    collider: Collider2D;
    point: Vec2;
    normal: Vec2;
    fraction: number;
  }

  // 音频
  export namespace AudioSource {
    const default: typeof AudioSourceComponent;
  }

  export class AudioSourceComponent extends Component {
    clip: AudioClip | null;
    loop: boolean;
    muted: boolean;
    volume: number;
    currentTime: number;
    duration: number;
    playing: boolean;

    play(): void;
    stop(): void;
    pause(): void;
    playOneShot(clip: AudioClip, volumeScale?: number): void;
  }

  // 微信小游戏声明
  interface WxUserInfo {
    nickName: string;
    avatarUrl: string;
    gender: number;
    province: string;
    city: string;
    country: string;
    language: string;
  }

  interface WxSystemInfo {
    brand: string;
    model: string;
    pixelRatio: number;
    screenWidth: number;
    screenHeight: number;
    windowWidth: number;
    windowHeight: number;
    statusBarHeight: number;
    language: string;
    version: string;
    system: string;
    platform: string;
    fontSizeSetting: number;
    SDKVersion: string;
    benchmarkLevel: number;
    albumAuthorized: boolean;
    cameraAuthorized: boolean;
    locationAuthorized: boolean;
    microphoneAuthorized: boolean;
    notificationAuthorized: boolean;
    notificationAlertAuthorized: boolean;
    notificationBadgeAuthorized: boolean;
    notificationSoundAuthorized: boolean;
    bluetoothEnabled: boolean;
    locationEnabled: boolean;
    wifiEnabled: boolean;
    safeArea: { top: number; bottom: number; left: number; right: number; width: number; height: number };
  }

  interface WxPerformance {
    usedJSHeapSize?: number;
    totalJSHeapSize?: number;
  }
}

// 微信小游戏全局对象
declare const wx: {
  login(options: {
    timeout?: number;
    success?: (res: { code: string }) => void;
    fail?: (res: { errMsg: string }) => void;
    complete?: () => void;
  }): void;

  getUserInfo(options: {
    withCredentials?: boolean;
    lang?: string;
    timeout?: number;
    success?: (res: { userInfo: import('cc').WxUserInfo; rawData: string; signature: string; encryptedData: string; iv: string; cloudID?: string }) => void;
    fail?: (res: { errMsg: string }) => void;
    complete?: () => void;
  }): void;

  getSystemInfoSync(): import('cc').WxSystemInfo;

  getPerformance(): import('cc').WxPerformance;

  triggerGC?(): void;

  shareAppMessage(options: {
    title?: string;
    imageUrl?: string;
    query?: string;
    imageUrlId?: string;
  }): void;

  requestPayment(options: {
    timeStamp: string;
    nonceStr: string;
    package: string;
    signType: 'MD5' | 'HMAC-SHA256' | 'RSA';
    paySign: string;
    success?: (res: unknown) => void;
    fail?: (res: { errMsg: string }) => void;
    complete?: () => void;
  }): void;

  createRewardedVideoAd(options: { adUnitId: string }): {
    show(): Promise<void>;
    load(): Promise<void>;
    onClose(callback: (res: { isEnded: boolean }) => void): void;
    onError(callback: (err: { errCode: number; errMsg: string }) => void): void;
    onLoad(callback: () => void): void;
    offClose(callback?: Function): void;
    offError(callback?: Function): void;
    offLoad(callback?: Function): void;
  };

  loadSubpackage(options: {
    name: string;
    success?: () => void;
    fail?: (res: { errMsg: string }) => void;
    complete?: () => void;
  }): { onProgressUpdate: (callback: (res: { progress: number }) => void) => void };

  cloud: {
    init(options?: { env?: string; traceUser?: boolean }): void;
    callFunction(options: {
      name: string;
      data?: unknown;
      success?: (res: { result: unknown }) => void;
      fail?: (res: { errMsg: string }) => void;
      complete?: () => void;
    }): void;
    uploadFile(options: {
      cloudPath: string;
      filePath: string;
      success?: (res: { fileID: string }) => void;
      fail?: (res: { errMsg: string }) => void;
      complete?: () => void;
    }): void;
    downloadFile(options: {
      fileID: string;
      success?: (res: { tempFilePath: string }) => void;
      fail?: (res: { errMsg: string }) => void;
      complete?: () => void;
    }): void;
  };

  request(options: {
    url: string;
    data?: unknown;
    header?: Record<string, string>;
    method?: 'OPTIONS' | 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'TRACE' | 'CONNECT';
    dataType?: 'json' | 'text' | 'arraybuffer';
    responseType?: 'text' | 'arraybuffer';
    success?: (res: { data: unknown; statusCode: number; header: Record<string, string> }) => void;
    fail?: (res: { errMsg: string }) => void;
    complete?: () => void;
  }): void;

  setStorage(options: {
    key: string;
    data: unknown;
    success?: () => void;
    fail?: (res: { errMsg: string }) => void;
    complete?: () => void;
  }): void;

  getStorage(options: {
    key: string;
    success?: (res: { data: unknown }) => void;
    fail?: (res: { errMsg: string }) => void;
    complete?: () => void;
  }): void;

  removeStorage(options: {
    key: string;
    success?: () => void;
    fail?: (res: { errMsg: string }) => void;
    complete?: () => void;
  }): void;

  clearStorage(options?: {
    success?: () => void;
    fail?: (res: { errMsg: string }) => void;
    complete?: () => void;
  }): void;

  getStorageInfoSync(): {
    keys: string[];
    currentSize: number;
    limitSize: number;
  };

  onMemoryWarning(callback: (res: { level: number }) => void): void;

  onAudioInterruptionBegin(callback: () => void): void;
  onAudioInterruptionEnd(callback: () => void): void;

  offAudioInterruptionBegin(callback?: Function): void;
  offAudioInterruptionEnd(callback?: Function): void;
} | undefined;
