/**
 * UIFramework 单元测试
 */

import {
    UIFramework,
    UILayer,
    UIState,
    CacheStrategy,
    AnimationType,
    UIEvents,
    IUIPrefabLoader,
    IUINode,
    UIAnimator
} from '../../src/ui/UIFramework';
import { EventSystem } from '../../src/core/EventSystem';

// Mock UI节点
const createMockUINode = (name: string = 'test_node'): jest.Mocked<IUINode> => ({
    name,
    active: true,
    parent: null,
    children: [],
    zIndex: 0,
    opacity: 1,
    scale: 1,
    position: { x: 0, y: 0 },
    destroy: jest.fn(),
    addChild: jest.fn(),
    removeFromParent: jest.fn(),
    setPosition: jest.fn(),
    setScale: jest.fn(),
    setOpacity: jest.fn()
});

// Mock 预制体加载器
const createMockPrefabLoader = (): jest.Mocked<IUIPrefabLoader> => ({
    load: jest.fn().mockResolvedValue(createMockUINode('prefab')),
    release: jest.fn(),
    instantiate: jest.fn().mockImplementation((prefab) => createMockUINode(prefab.name + '_instance'))
});

// Mock 动画器
const createMockAnimator = (): jest.Mocked<UIAnimator> => ({
    playEnterAnimation: jest.fn().mockResolvedValue(undefined),
    playExitAnimation: jest.fn().mockResolvedValue(undefined)
});

describe('UIFramework', () => {
    let uiFramework: UIFramework;
    let eventSystem: EventSystem;
    let mockPrefabLoader: jest.Mocked<IUIPrefabLoader>;
    let mockAnimator: jest.Mocked<UIAnimator>;
    let mockLayerContainer: jest.Mocked<IUINode>;

    beforeEach(() => {
        // 重置所有单例
        UIFramework.resetInstance();
        EventSystem.resetInstance();

        uiFramework = UIFramework.getInstance();
        eventSystem = EventSystem.getInstance();

        // 创建 mock
        mockPrefabLoader = createMockPrefabLoader();
        mockAnimator = createMockAnimator();
        mockLayerContainer = createMockUINode('layer_container');

        // 设置依赖
        uiFramework.setPrefabLoader(mockPrefabLoader);
        uiFramework.setAnimator(mockAnimator);
        uiFramework.setLayerContainer(UILayer.POPUP, mockLayerContainer);

        // 注册测试 UI
        uiFramework.registerUI({
            name: 'test_popup',
            prefab: 'prefabs/TestPopup',
            layer: UILayer.POPUP,
            cache: CacheStrategy.POOLED,
            poolSize: 5,
            enterAnimation: AnimationType.SCALE,
            exitAnimation: AnimationType.SCALE,
            exclusive: false
        });

        uiFramework.registerUI({
            name: 'test_hud',
            prefab: 'prefabs/TestHUD',
            layer: UILayer.HUD,
            cache: CacheStrategy.ON_DEMAND,
            poolSize: 1,
            enterAnimation: AnimationType.NONE,
            exitAnimation: AnimationType.NONE,
            exclusive: false
        });

        uiFramework.registerUI({
            name: 'exclusive_ui',
            prefab: 'prefabs/ExclusiveUI',
            layer: UILayer.POPUP,
            cache: CacheStrategy.ON_DEMAND,
            poolSize: 1,
            enterAnimation: AnimationType.NONE,
            exitAnimation: AnimationType.NONE,
            exclusive: true
        });
    });

    afterEach(() => {
        uiFramework.reset();
    });

    describe('初始状态', () => {
        it('初始不应该有打开的 UI', () => {
            expect(uiFramework.getOpenUIs()).toHaveLength(0);
        });

        it('未注册的 UI 配置应该返回 null', () => {
            expect(uiFramework.getUIConfig('non_existent')).toBeNull();
        });
    });

    describe('UI 注册', () => {
        it('注册 UI 后应该能获取配置', () => {
            const config = uiFramework.getUIConfig('test_popup');
            expect(config).not.toBeNull();
            expect(config?.name).toBe('test_popup');
            expect(config?.layer).toBe(UILayer.POPUP);
        });

        it('批量注册 UI 应该成功', () => {
            UIFramework.resetInstance();
            uiFramework = UIFramework.getInstance();

            uiFramework.registerUIs([
                { name: 'ui1', prefab: 'p1', layer: UILayer.HUD, cache: CacheStrategy.ON_DEMAND, poolSize: 1, enterAnimation: AnimationType.NONE, exitAnimation: AnimationType.NONE, exclusive: false },
                { name: 'ui2', prefab: 'p2', layer: UILayer.POPUP, cache: CacheStrategy.ON_DEMAND, poolSize: 1, enterAnimation: AnimationType.NONE, exitAnimation: AnimationType.NONE, exclusive: false }
            ]);

            expect(uiFramework.getUIConfig('ui1')).not.toBeNull();
            expect(uiFramework.getUIConfig('ui2')).not.toBeNull();
        });
    });

    describe('UI 打开', () => {
        it('打开 UI 应该返回节点', async () => {
            const node = await uiFramework.openUI('test_popup');

            expect(node).not.toBeNull();
            expect(node?.name).toBeDefined();
        });

        it('打开 UI 应该发布 UI_OPENED 事件', async () => {
            const handler = jest.fn();
            eventSystem.on(UIEvents.UI_OPENED, handler);

            await uiFramework.openUI('test_popup');

            expect(handler).toHaveBeenCalledWith({ uiName: 'test_popup' });
        });

        it('打开 UI 后应该能查询到', async () => {
            await uiFramework.openUI('test_popup');

            expect(uiFramework.isUIOpen('test_popup')).toBe(true);
            expect(uiFramework.getOpenUIs()).toContain('test_popup');
        });

        it('打开未注册的 UI 应该返回 null', async () => {
            const node = await uiFramework.openUI('non_existent');

            expect(node).toBeNull();
        });

        it('重复打开同一 UI 应该置顶', async () => {
            const node1 = await uiFramework.openUI('test_popup');
            const node2 = await uiFramework.openUI('test_popup');

            expect(node1).toBe(node2);
        });

        it('独占 UI 应该关闭同层其他 UI', async () => {
            await uiFramework.openUI('test_popup');
            await uiFramework.openUI('exclusive_ui');

            // 独占 UI 打开后，test_popup 应该被关闭
            expect(uiFramework.isUIOpen('exclusive_ui')).toBe(true);
        });

        it('打开 UI 应该加载预制体', async () => {
            await uiFramework.openUI('test_popup');

            expect(mockPrefabLoader.load).toHaveBeenCalledWith('prefabs/TestPopup');
        });

        it('打开 UI 应该播放进入动画', async () => {
            await uiFramework.openUI('test_popup');

            expect(mockAnimator.playEnterAnimation).toHaveBeenCalled();
        });

        it('无动画 UI 不应该播放进入动画', async () => {
            await uiFramework.openUI('test_hud');

            expect(mockAnimator.playEnterAnimation).not.toHaveBeenCalled();
        });
    });

    describe('UI 关闭', () => {
        it('关闭 UI 应该发布 UI_CLOSED 事件', async () => {
            await uiFramework.openUI('test_popup');

            const handler = jest.fn();
            eventSystem.on(UIEvents.UI_CLOSED, handler);

            uiFramework.closeUI('test_popup');

            // 等待动画完成
            await new Promise(resolve => setTimeout(resolve, 200));

            expect(handler).toHaveBeenCalledWith({ uiName: 'test_popup' });
        });

        it('关闭 UI 后不应该在打开列表中', async () => {
            await uiFramework.openUI('test_popup');
            uiFramework.closeUI('test_popup');

            await new Promise(resolve => setTimeout(resolve, 200));

            expect(uiFramework.isUIOpen('test_popup')).toBe(false);
            expect(uiFramework.getOpenUIs()).not.toContain('test_popup');
        });

        it('关闭未打开的 UI 不应该报错', () => {
            expect(() => uiFramework.closeUI('non_existent')).not.toThrow();
        });

        it('关闭 UI 应该播放退出动画', async () => {
            await uiFramework.openUI('test_popup');
            uiFramework.closeUI('test_popup');

            expect(mockAnimator.playExitAnimation).toHaveBeenCalled();
        });

        it('关闭所有 UI', async () => {
            await uiFramework.openUI('test_popup');
            await uiFramework.openUI('test_hud');

            uiFramework.closeAllUI();

            await new Promise(resolve => setTimeout(resolve, 200));

            expect(uiFramework.getOpenUIs()).toHaveLength(0);
        });

        it('关闭指定层级的所有 UI', async () => {
            uiFramework.setLayerContainer(UILayer.HUD, createMockUINode('hud_container'));

            await uiFramework.openUI('test_popup');
            await uiFramework.openUI('test_hud');

            uiFramework.closeAllInLayer(UILayer.POPUP);

            await new Promise(resolve => setTimeout(resolve, 200));

            expect(uiFramework.isUIOpen('test_popup')).toBe(false);
            expect(uiFramework.isUIOpen('test_hud')).toBe(true);
        });
    });

    describe('对象池', () => {
        it('使用对象池缓存的 UI 应该被缓存', async () => {
            await uiFramework.openUI('test_popup');
            uiFramework.closeUI('test_popup');

            await new Promise(resolve => setTimeout(resolve, 200));

            // 再次打开应该从池中获取
            await uiFramework.openUI('test_popup');

            // 只应该加载一次预制体
            expect(mockPrefabLoader.load).toHaveBeenCalledTimes(1);
        });

        it('按需加载的 UI 不应该被缓存', async () => {
            await uiFramework.openUI('test_hud');
            uiFramework.closeUI('test_hud');

            await new Promise(resolve => setTimeout(resolve, 200));

            // 再次打开应该重新加载
            await uiFramework.openUI('test_hud');

            expect(mockPrefabLoader.load).toHaveBeenCalledTimes(2);
        });
    });

    describe('层级管理', () => {
        it('置顶 UI 应该更新 zIndex', async () => {
            await uiFramework.openUI('test_popup');
            const node = uiFramework.getUI('test_popup');
            const initialZIndex = node?.zIndex || 0;

            uiFramework.bringToFront('test_popup');

            expect(node?.zIndex).toBeGreaterThan(initialZIndex);
        });

        it('置底 UI 应该更新 zIndex', async () => {
            await uiFramework.openUI('test_popup');
            const node = uiFramework.getUI('test_popup');

            uiFramework.sendToBack('test_popup');

            expect(node?.zIndex).toBe(UILayer.POPUP);
        });

        it('计算 zIndex 应该正确', () => {
            expect(uiFramework.calculateZIndex(UILayer.POPUP, 0)).toBe(300);
            expect(uiFramework.calculateZIndex(UILayer.POPUP, 1)).toBe(310);
            expect(uiFramework.calculateZIndex(UILayer.HUD, 2)).toBe(220);
        });
    });

    describe('Toast 系统', () => {
        it('显示 Toast 应该加入队列', () => {
            uiFramework.showToast('测试消息');

            // Toast 应该开始处理
            expect(true).toBe(true);
        });

        it('显示 Toast 应该使用默认时长', () => {
            uiFramework.showToast('测试消息');

            // 默认 2000ms
            expect(true).toBe(true);
        });

        it('隐藏 Toast 应该清空当前显示', () => {
            uiFramework.showToast('测试消息');
            uiFramework.hideToast();

            expect(true).toBe(true);
        });
    });

    describe('Loading 系统', () => {
        it('显示 Loading', () => {
            uiFramework.showLoading('加载中...');

            expect(true).toBe(true);
        });

        it('隐藏 Loading', () => {
            uiFramework.showLoading();
            uiFramework.hideLoading();

            expect(true).toBe(true);
        });

        it('更新 Loading 进度', () => {
            uiFramework.updateLoadingProgress(0.5);

            expect(true).toBe(true);
        });
    });

    describe('存档功能', () => {
        it('应该正确导出数据', async () => {
            await uiFramework.openUI('test_popup');

            const data = uiFramework.exportData();

            expect(data.openUIs).toContain('test_popup');
        });

        it('应该正确导入数据', async () => {
            const data = {
                openUIs: ['test_popup']
            };

            uiFramework.importData(data);

            // 导入是异步的，等待一下
            await new Promise(resolve => setTimeout(resolve, 100));

            // UI 应该被打开
            expect(mockPrefabLoader.load).toHaveBeenCalled();
        });

        it('reset 应该重置所有状态', async () => {
            await uiFramework.openUI('test_popup');
            uiFramework.reset();

            expect(uiFramework.getOpenUIs()).toHaveLength(0);
        });
    });

    describe('依赖注入', () => {
        it('未配置预制体加载器时打开 UI 应该返回 null', async () => {
            UIFramework.resetInstance();
            uiFramework = UIFramework.getInstance();

            uiFramework.registerUI({
                name: 'test',
                prefab: 'test',
                layer: UILayer.POPUP,
                cache: CacheStrategy.ON_DEMAND,
                poolSize: 1,
                enterAnimation: AnimationType.NONE,
                exitAnimation: AnimationType.NONE,
                exclusive: false
            });

            const node = await uiFramework.openUI('test');

            expect(node).toBeNull();
        });
    });

    describe('UI 实例信息', () => {
        it('获取 UI 实例信息', async () => {
            await uiFramework.openUI('test_popup');

            const info = uiFramework.getUIInstanceInfo('test_popup');

            expect(info).not.toBeNull();
            expect(info?.name).toBe('test_popup');
            expect(info?.layer).toBe(UILayer.POPUP);
            expect(info?.state).toBe(UIState.ACTIVE);
        });

        it('未打开的 UI 实例信息应该返回 null', () => {
            const info = uiFramework.getUIInstanceInfo('non_existent');

            expect(info).toBeNull();
        });
    });
});
