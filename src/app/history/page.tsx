// Server Component（useEffect・fetch('/api/...')不要。直接Supabaseから取得）
import { createClient } from '@/utils/supabase/server';
import { HistoryList } from '@/components/HistoryList';

export default async function HistoryPage() {
  const supabase = await createClient();

  // ミドルウェアで認証済みが保証されているため、ここでリダイレクト不要
  const { data: { user } } = await supabase.auth.getUser();

  // サーバー側で直接DBから履歴を取得（/api/diagnose/history を叩かない）
  const { data: diagnoses } = await supabase
    .from('diagnoses')
    .select('id, brand_name, estimated_era, buying_guide, created_at, overall_image_url, tag_image_url')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false });

  return (
    <div className="flex flex-col space-y-6 animate-fade-in">
      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#f5f2eb]">診断履歴</h1>
        <p className="text-xs text-[#a39c93]">過去に鑑定した古着の一覧</p>
      </div>

      {/* 検索・フィルタはクライアントコンポーネントに委譲 */}
      <HistoryList diagnoses={diagnoses || []} />
    </div>
  );
}
