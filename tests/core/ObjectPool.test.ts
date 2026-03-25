/**
 * ObjectPool 测试
 */

import {
    ObjectPool,
    ObjectPoolConfig,
    ObjectPoolManager
} from '../../src/core/ObjectPool';

describe('ObjectPool', () => {
    interface TestObject {
        id: number;
        data: string;
        reset: () => void;
    }

    const createFactory = (): TestObject => ({
        id: Math.random(),
        data: '',
        reset() {
            this.data = '';
        }
    });

    const defaultConfig: ObjectPoolConfig<TestObject> = {
        name: 'test-pool',
        maxSize: 5,
        factory: createFactory,
        reset: (obj) => obj.reset(),
        destroy: (obj) => { obj.data = 'destroyed'; }
    };

    describe('初始化', () => {
        it('应该正确初始化对象池', () => {
            const pool = new ObjectPool<TestObject>(defaultConfig);

            expect(pool.name).toBe('test-pool');
            expect(pool.size).toBe(0);
        });

        it('应该支持预热', () => {
            const config = { ...defaultConfig, initialSize: 3 };
            const pool = new ObjectPool<TestObject>(config);

            expect(pool.size).toBe(3);
        });

        it('初始大小不应该超过最大大小', () => {
            const config = { ...defaultConfig, initialSize: 10 };
            const pool = new ObjectPool<TestObject>(config);

            expect(pool.size).toBe(5); // maxSize
        });
    });

    describe('acquire', () => {
        it('应该从池中获取对象', () => {
            const pool = new ObjectPool<TestObject>(defaultConfig);
            pool.warmup(2);

            const obj = pool.acquire();

            expect(obj).toBeDefined();
            expect(pool.size).toBe(1);
        });

        it('池空时应该创建新对象', () => {
            const pool = new ObjectPool<TestObject>(defaultConfig);

            const obj = pool.acquire();

            expect(obj).toBeDefined();
            expect(pool.size).toBe(0);
        });

        it('应该正确更新统计信息', () => {
            const pool = new ObjectPool<TestObject>(defaultConfig);

            pool.acquire();
            pool.acquire();

            const stats = pool.getStats();
            expect(stats.totalAcquire).toBe(2);
        });
    });

    describe('release', () => {
        it('应该归还对象到池中', () => {
            const pool = new ObjectPool<TestObject>(defaultConfig);
            const obj = pool.acquire();

            pool.release(obj);

            expect(pool.size).toBe(1);
        });

        it('池满时应该销毁对象', () => {
            const pool = new ObjectPool<TestObject>(defaultConfig);
            pool.warmup(5);

            // 获取所有5个对象
            const objects = pool.acquireMultiple(5);
            expect(pool.size).toBe(0);

            // 释放一个对象
            pool.release(objects[0]);
            expect(pool.size).toBe(1);

            // 释放更多对象直到池满
            pool.release(objects[1]);
            pool.release(objects[2]);
            pool.release(objects[3]);
            pool.release(objects[4]);
            expect(pool.size).toBe(5);

            // 再释放一个对象，池已满，应该销毁
            pool.release(objects[0]);
            expect(pool.size).toBe(5); // 池大小不变
            expect(objects[0].data).toBe('destroyed'); // 应该被销毁
        });

        it('应该调用 reset 函数', () => {
            const pool = new ObjectPool<TestObject>(defaultConfig);
            const obj = pool.acquire();
            obj.data = 'test-data';

            pool.release(obj);

            expect(obj.data).toBe('');
        });

        it('应该正确更新活跃计数', () => {
            const pool = new ObjectPool<TestObject>(defaultConfig);

            const obj1 = pool.acquire();
            const obj2 = pool.acquire(); // 第二个对象保持活跃

            pool.release(obj1);
            // obj2 仍然活跃

            const stats = pool.getStats();
            expect(stats.activeCount).toBe(1);
            expect(obj2).toBeDefined(); // 使用 obj2
        });
    });

    describe('clear', () => {
        it('应该清空池中所有对象', () => {
            const pool = new ObjectPool<TestObject>(defaultConfig);
            pool.warmup(3);

            pool.clear();

            expect(pool.size).toBe(0);
        });
    });

    describe('shrink', () => {
        it('应该收缩池到目标大小', () => {
            const pool = new ObjectPool<TestObject>(defaultConfig);
            pool.warmup(5);

            pool.shrink(2);

            expect(pool.size).toBe(2);
        });

        it('目标大小大于当前大小时不应该收缩', () => {
            const pool = new ObjectPool<TestObject>(defaultConfig);
            pool.warmup(2);

            pool.shrink(5);

            expect(pool.size).toBe(2);
        });
    });

    describe('统计', () => {
        it('应该正确计算缓存命中率', () => {
            const pool = new ObjectPool<TestObject>(defaultConfig);
            pool.warmup(2);

            // 缓存命中
            pool.acquire();
            pool.acquire();
            // 缓存未命中
            pool.acquire();

            const stats = pool.getStats();
            expect(stats.cacheHits).toBe(2);
            expect(stats.cacheMisses).toBe(1);
            expect(stats.hitRate).toBeCloseTo(0.67, 0.01);
        });
    });

    describe('destroy', () => {
        it('应该销毁池', () => {
            const pool = new ObjectPool<TestObject>(defaultConfig);
            pool.warmup(3);

            pool.destroy();

            expect(pool.size).toBe(0);
        });
    });
});

describe('ObjectPoolManager', () => {
    describe('单例模式', () => {
        it('应该返回同一实例', () => {
            const instance1 = ObjectPoolManager.getInstance();
            const instance2 = ObjectPoolManager.getInstance();

            expect(instance1).toBe(instance2);
        });
    });

    describe('池管理', () => {
        it('应该创建和获取池', () => {
            const manager = ObjectPoolManager.getInstance();

            interface TestItem {
                value: number;
                reset(): void;
            }

            const config: ObjectPoolConfig<TestItem> = {
                name: 'manager-test-pool',
                maxSize: 10,
                factory: () => ({
                    value: 0,
                    reset() { this.value = 0; }
                }),
                reset: (obj) => obj.reset()
            };

            const pool = manager.createPool(config);

            expect(pool).toBeDefined();
            expect(manager.hasPool('manager-test-pool')).toBe(true);
            expect(manager.getPool('manager-test-pool')).toBe(pool);
        });

        it('重复创建应该返回已存在的池', () => {
            const manager = ObjectPoolManager.getInstance();

            interface Item {
                id: number;
            }

            const config: ObjectPoolConfig<Item> = {
                name: 'duplicate-test',
                maxSize: 5,
                factory: () => ({ id: 0 })
            };

            const pool1 = manager.createPool(config);
            const pool2 = manager.createPool(config);

            expect(pool1).toBe(pool2);
        });
    });

    describe('便捷方法', () => {
        it('acquire 应该从指定池获取对象', () => {
            const manager = ObjectPoolManager.getInstance();

            interface Item {
                value: number;
            }

            manager.createPool<Item>({
                name: 'convenience-test',
                maxSize: 5,
                factory: () => ({ value: 42 })
            });

            const obj = manager.acquire<Item>('convenience-test');

            expect(obj).toBeDefined();
            expect(obj?.value).toBe(42);
        });

        it('release 应该归还对象到指定池', () => {
            const manager = ObjectPoolManager.getInstance();

            interface Item {
                value: number;
            }

            manager.createPool<Item>({
                name: 'release-test',
                maxSize: 5,
                factory: () => ({ value: 1 })
            });

            const obj = manager.acquire<Item>('release-test');
            manager.release('release-test', obj!);

            const stats = manager.getPool<Item>('release-test')?.getStats();
            expect(stats?.poolSize).toBe(1);
        });
    });

    describe('批量操作', () => {
        it('getAllStats 应该返回所有池的统计', () => {
            const manager = ObjectPoolManager.getInstance();

            manager.createPool({
                name: 'stats-test-1',
                maxSize: 5,
                factory: () => ({ x: 1 })
            });

            manager.createPool({
                name: 'stats-test-2',
                maxSize: 5,
                factory: () => ({ x: 2 })
            });

            const allStats = manager.getAllStats();

            expect(allStats.length).toBeGreaterThanOrEqual(2);
        });
    });
});
