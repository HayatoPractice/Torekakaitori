import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/utils/supabase/server';
import { uploadBase64Image } from '@/utils/supabase/storage';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // ユーザー認証の確認
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // リクエストデータの取得
    const body = await request.json();
    const { brandName, estimatedEra, features, image, salePrice } = body;

    // バリデーション
    if (!brandName || !estimatedEra || !features || !image) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const submissionId = crypto.randomUUID();

    // モックモードの判定
    const isMockMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    const adminSupabase = createAdminClient();

    if (isMockMode) {
      // データベースにインサート (モッククライアントがインメモリ保存してくれる)
      const { data: submission } = await adminSupabase
        .from('submissions')
        .insert({
          id: submissionId,
          user_id: user.id,
          brand_name: brandName.trim(),
          estimated_era: estimatedEra.trim(),
          features: features.trim(),
          image_url: '/favicon.ico',
          sale_price: salePrice ? Number(salePrice) : null,
          status: 'approved' // テストをスムーズに行うため、モックでは即座に approved にしてプレミアム期間延長トリガーを実行させる
        })
        .select()
        .single();

      return NextResponse.json({
        success: true,
        submissionId: submission.id
      });
    }

    // 画像のアップロード
    const imageUrl = await uploadBase64Image(image, `submissions/${user.id}/${submissionId}.jpg`);

    // データベースにインサート
    const { data: submission, error: dbError } = await adminSupabase
      .from('submissions')
      .insert({
        id: submissionId,
        user_id: user.id,
        brand_name: brandName.trim(),
        estimated_era: estimatedEra.trim(),
        features: features.trim(),
        image_url: imageUrl,
        sale_price: salePrice ? Number(salePrice) : null,
        status: 'pending' // 承認待ち初期状態
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      submissionId: submission.id
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Submissions API error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
