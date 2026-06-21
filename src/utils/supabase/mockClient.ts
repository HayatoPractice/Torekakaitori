// Mock Supabase Client for local testing without valid credentials
// This file simulates Supabase Auth & Database behaviour in-memory.

const MOCK_USER = {
  id: 'mock-user-id-123456',
  email: 'mock@vintverify.com',
};

// ローカルストレージキー
const STORAGE_KEYS = {
  USER: 'vv_mock_user',
  PREMIUM_UNTIL: 'vv_mock_premium_until',
  DIAGNOSES: 'vv_mock_diagnoses',
  SUBMISSIONS: 'vv_mock_submissions',
  PRICE_LOG: 'vv_mock_price_log'
};

// 初期ダミーデータ
const INITIAL_DIAGNOSES = [
  {
    id: 'mock-diagnose-1',
    user_id: 'mock-user-id-123456',
    brand_name: 'Nike',
    estimated_era: '90年代',
    evidence_reason: 'タグの銀タグデザイン（90年代初期に特徴的）および、シングルステッチによる袖・裾の縫製仕様。ジッパーはYKK製を使用。ナイロンの質感が当時のアウターに合致しています。\n\n【仕入れ推奨理由】\n国内ヴィンテージ市場において90s Nikeのアウターは安定した人気があり、推定売値8,500円に対して仕入れ値3,000円以下であれば十分利益が狙えます。',
    overall_image_url: '/favicon.ico',
    tag_image_url: '/favicon.ico',
    buying_guide: 'buy',
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1日前
  },
  {
    id: 'mock-diagnose-2',
    user_id: 'mock-user-id-123456',
    brand_name: 'Levi\'s',
    estimated_era: '70年代前半',
    evidence_reason: 'バックポケットの赤タブが「Big E」、ボタン裏の刻印が「6」、すそがシングルステッチで仕上げられています。パッチは欠損していますが、デニムの縦落ちから70年代初頭の501と判定。\n\n【仕入れ推奨理由】\nヴィンテージデニムの価格は高騰しており、多少のダメージがあっても希少価値が高いです。',
    overall_image_url: '/favicon.ico',
    tag_image_url: '/favicon.ico',
    buying_guide: 'buy',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() // 5日前
  },
  {
    id: 'mock-diagnose-3',
    user_id: 'mock-user-id-123456',
    brand_name: 'Adidas',
    estimated_era: '00年代初期',
    evidence_reason: 'タグが万国旗タグであり、生産国はインドネシア。現行品に近いダブルステッチ仕上げですが、ロゴ刺繍の太さから00年代初期と推測されます。\n\n【仕入れ推奨理由】\n現行と大差ないデザインであり、相場的にも高値はつきにくいため、仕入れは見送るか極めて安価な場合のみ推奨します。',
    overall_image_url: '/favicon.ico',
    tag_image_url: '/favicon.ico',
    buying_guide: 'skip',
    created_at: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString() // 100日前 (90日 stale 警告テスト用)
  }
];

const INITIAL_PRICE_LOG = [
  { brand_name: 'Nike', era: '90年代', price: 6500, source: 'ai', created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() },
  { brand_name: 'Nike', era: '90年代', price: 7800, source: 'user_submission', created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
  { brand_name: 'Nike', era: '90年代', price: 8500, source: 'ai', created_at: new Date().toISOString() },
  { brand_name: 'Levi\'s', era: '70年代前半', price: 35000, source: 'ai', created_at: new Date().toISOString() },
  { brand_name: 'Adidas', era: '00年代初期', price: 2500, source: 'ai', created_at: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString() } // 100日前
];

// ヘルパー: ブラウザ環境か判定
const isBrowser = typeof window !== 'undefined';

// モックデータの取得・保存
export const mockDb = {
  getUser() {
    if (!isBrowser) return MOCK_USER;
    const user = localStorage.getItem(STORAGE_KEYS.USER);
    return user ? JSON.parse(user) : null;
  },
  setUser(user: any) {
    if (!isBrowser) return;
    if (user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
  },
  getPremiumUntil() {
    if (!isBrowser) return new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(); // サーバーサイドではプレミアム
    const until = localStorage.getItem(STORAGE_KEYS.PREMIUM_UNTIL);
    if (!until) {
      // 初期状態は現在時刻 (非プレミアム)
      const defaultUntil = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.PREMIUM_UNTIL, defaultUntil);
      return defaultUntil;
    }
    return until;
  },
  setPremiumUntil(dateStr: string) {
    if (!isBrowser) return;
    localStorage.setItem(STORAGE_KEYS.PREMIUM_UNTIL, dateStr);
  },
  getDiagnoses() {
    if (!isBrowser) return INITIAL_DIAGNOSES;
    const data = localStorage.getItem(STORAGE_KEYS.DIAGNOSES);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.DIAGNOSES, JSON.stringify(INITIAL_DIAGNOSES));
      return INITIAL_DIAGNOSES;
    }
    return JSON.parse(data);
  },
  addDiagnosis(diag: any) {
    const list = this.getDiagnoses();
    list.unshift(diag);
    if (isBrowser) {
      localStorage.setItem(STORAGE_KEYS.DIAGNOSES, JSON.stringify(list));
    }
  },
  getPriceLogs() {
    if (!isBrowser) return INITIAL_PRICE_LOG;
    const data = localStorage.getItem(STORAGE_KEYS.PRICE_LOG);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.PRICE_LOG, JSON.stringify(INITIAL_PRICE_LOG));
      return INITIAL_PRICE_LOG;
    }
    return JSON.parse(data);
  },
  addPriceLog(brand: string, era: string, price: number, source: string) {
    const list = this.getPriceLogs();
    list.push({
      brand_name: brand,
      era: era,
      price: price,
      source: source,
      created_at: new Date().toISOString()
    });
    if (isBrowser) {
      localStorage.setItem(STORAGE_KEYS.PRICE_LOG, JSON.stringify(list));
    }
  },
  getSubmissions() {
    if (!isBrowser) return [];
    const data = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
    return data ? JSON.parse(data) : [];
  },
  addSubmission(sub: any) {
    const list = this.getSubmissions();
    list.unshift(sub);
    if (isBrowser) {
      localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(list));
    }

    // トリガーシミュレーション (status === 'approved' の場合)
    if (sub.status === 'approved') {
      // 1. 実売価格をprice_logへ挿入
      if (sub.sale_price) {
        this.addPriceLog(sub.brand_name, sub.estimated_era, sub.sale_price, 'user_submission');
      }

      // 2. プレミアム期間を7日間延長
      const currentUntil = this.getPremiumUntil();
      const now = new Date();
      const currentUntilDate = new Date(currentUntil);
      
      const baseDate = currentUntilDate > now ? currentUntilDate : now;
      const newUntil = new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      this.setPremiumUntil(newUntil);
    }
  }
};

// モックSupabaseクライアントクラスの定義
class MockSupabaseClient {
  auth = {
    async getUser() {
      const user = mockDb.getUser();
      return { data: { user }, error: null };
    },
    async signInWithPassword({ email }: any) {
      const user = { id: 'mock-user-id-123456', email };
      mockDb.setUser(user);
      return { data: { user }, error: null };
    },
    async signUp({ email }: any) {
      // サインアップ時も仮ユーザーを作成
      const user = { id: 'mock-user-id-123456', email };
      return { data: { user }, error: null };
    },
    async signOut() {
      mockDb.setUser(null);
      return { error: null };
    }
  };

  storage = {
    from() {
      return {
        async upload() {
          return { data: { path: 'mock-path.jpg' }, error: null };
        },
        getPublicUrl() {
          return { data: { publicUrl: '/favicon.ico' } };
        }
      };
    }
  };

  // RPC（Postgres関数呼び出し）のシミュレーション
  // 本番の get_price_stats と同じ集計結果（テーブル返却 = 配列）を返す
  async rpc(fnName: string, params?: any) {
    if (fnName === 'get_price_stats') {
      const brand = params?.p_brand;
      const era = params?.p_era;
      const logs = mockDb.getPriceLogs().filter(
        (log: any) =>
          log.brand_name?.toLowerCase() === brand?.toLowerCase() && log.era === era
      );

      if (logs.length === 0) {
        return { data: [], error: null };
      }

      const prices = logs.map((log: any) => Number(log.price));
      const lastUpdated = logs
        .map((log: any) => log.created_at)
        .sort()
        .at(-1);

      return {
        data: [
          {
            min_price: Math.min(...prices),
            max_price: Math.max(...prices),
            avg_price: Math.round(prices.reduce((a: number, b: number) => a + b, 0) / prices.length),
            cnt: prices.length,
            last_updated: lastUpdated,
          },
        ],
        error: null,
      };
    }

    return { data: null, error: new Error(`Mock rpc: unknown function ${fnName}`) };
  }

  // ビルダインターフェースのシミュレーション
  from(table: string) {
    const self = this;
    let queryData: any[] = [];
    
    if (table === 'users') {
      const premium_until = mockDb.getPremiumUntil();
      queryData = [{ id: 'mock-user-id-123456', email: 'mock@vintverify.com', premium_until }];
    } else if (table === 'diagnoses') {
      queryData = mockDb.getDiagnoses();
    } else if (table === 'price_log') {
      queryData = mockDb.getPriceLogs();
    } else if (table === 'submissions') {
      queryData = mockDb.getSubmissions();
    }

    const builder = {
      data: queryData,
      error: null as any,
      
      select(fields: string, options?: any) {
        // count: 'exact' 等のシミュレーション
        if (options?.count === 'exact') {
          return {
            count: this.data.length,
            error: null
          };
        }
        return this;
      },
      
      eq(field: string, value: any) {
        if (field === 'id') {
          this.data = this.data.filter(item => item.id === value);
        } else if (field === 'user_id') {
          this.data = this.data.filter(item => item.user_id === value);
        } else if (field === 'brand_name') {
          this.data = this.data.filter(item => item.brand_name?.toLowerCase() === value?.toLowerCase());
        } else if (field === 'era') {
          this.data = this.data.filter(item => item.era === value);
        }
        return this;
      },

      gte(field: string, value: any) {
        if (field === 'created_at') {
          this.data = this.data.filter(item => new Date(item.created_at) >= new Date(value));
        }
        return this;
      },

      order(field: string, options?: any) {
        this.data.sort((a, b) => {
          const valA = new Date(a[field]).getTime();
          const valB = new Date(b[field]).getTime();
          return options?.ascending ? valA - valB : valB - valA;
        });
        return this;
      },

      single() {
        return {
          data: this.data[0] || null,
          error: this.data.length === 0 ? new Error('Not found') : null
        };
      },

      async insert(payload: any) {
        const item = {
          id: payload.id || 'mock-generated-id-' + Math.random().toString(36).substr(2, 9),
          created_at: new Date().toISOString(),
          ...payload
        };

        if (table === 'diagnoses') {
          mockDb.addDiagnosis(item);
        } else if (table === 'submissions') {
          mockDb.addSubmission(item);
        } else if (table === 'price_log') {
          mockDb.addPriceLog(payload.brand_name, payload.era, payload.price, payload.source);
        }
        
        return {
          data: item,
          error: null,
          select() {
            return {
              single() {
                return { data: item, error: null };
              }
            };
          }
        };
      }
    };

    return builder;
  }
}

export function createMockSupabaseClient() {
  return new MockSupabaseClient() as any;
}
