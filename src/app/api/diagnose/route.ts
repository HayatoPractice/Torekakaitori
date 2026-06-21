import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/utils/supabase/server';
import { uploadBase64Image } from '@/utils/supabase/storage';
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

// AIが返すべき鑑定結果の型をZodスキーマで定義（正規表現パース不要、型安全）
const diagnosisSchema = z.object({
  brandName: z.string().describe('判定されたブランド名。特定できない場合は「不明」または推測されるブランド名'),
  estimatedEra: z.string().describe('推定年代（例: 70年代、80年代後半、90年代初期）'),
  evidenceReason: z.string().describe('鑑定根拠（タグ、ロゴ、ステッチ、縫製等の特徴から年代を裏付ける詳細な説明。300文字程度）'),
  buyingGuide: z.enum(['buy', 'skip', 'hold']).describe('仕入れ判定。buy=仕入れ推奨、skip=見送り、hold=様子見'),
  buyingGuideReason: z.string().describe('仕入れ判定の理由説明'),
  estimatedPrice: z.number().optional().describe('日本国内での推定相場価格（日本円での平均的な売値期待値）'),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. ユーザー認証の確認
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. 無料枠チェック
    const adminSupabase = createAdminClient();
    const { data: userData } = await adminSupabase
      .from('users')
      .select('premium_until')
      .eq('id', user.id)
      .single();

    const isPremium = userData && new Date(userData.premium_until) > new Date();

    if (!isPremium) {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { count, error: countError } = await adminSupabase
        .from('diagnoses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', firstDayOfMonth);

      if (countError) {
        console.error('Count diagnoses error:', countError);
        return NextResponse.json({ error: 'Database error checking usage limit' }, { status: 500 });
      }

      if (count && count >= 10) {
        return NextResponse.json({
          error: 'usage_limit_exceeded',
          message: '無料プランの診断回数（月10回）を超過しました。ナレッジ共有でプレミアム特典（7日間）を獲得するか、プランに加入してください。'
        }, { status: 403 });
      }
    }

    // 3. リクエストデータの検証
    const body = await request.json();
    const { overallImage, tagImage, hintBrand } = body;

    if (!overallImage || !tagImage) {
      return NextResponse.json({ error: 'Overall image and tag image are required' }, { status: 400 });
    }

    const diagnoseId = crypto.randomUUID();

    // 4. Base64からプレフィックスを除いてMIMEタイプを取得
    const cleanOverall = overallImage.replace(/^data:image\/\w+;base64,/, '');
    const cleanTag = tagImage.replace(/^data:image\/\w+;base64,/, '');
    const overallMime = overallImage.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';
    const tagMime = tagImage.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';

    // モックモードの判定
    const isMockMode = !process.env.ANTHROPIC_API_KEY ||
      process.env.ANTHROPIC_API_KEY.includes('placeholder') ||
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isMockMode) {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const isLevis = hintBrand?.toLowerCase().includes('levi');
      const isAdidas = hintBrand?.toLowerCase().includes('adidas');

      let mockResult: { brandName: string; estimatedEra: string; evidenceReason: string; buyingGuide: 'buy' | 'skip' | 'hold'; buyingGuideReason: string; estimatedPrice: number } = {
        brandName: 'Nike',
        estimatedEra: '90年代',
        evidenceReason: 'タグの銀タグデザイン（90年代初期に特徴的）および、シングルステッチによる袖・裾の縫製仕様。ジッパーはYKK製を使用。ナイロンの質感が当時のアウターに合致しています。',
        buyingGuide: 'buy',
        buyingGuideReason: '国内ヴィンテージ市場において90s Nikeのアウターは安定した人気があり、十分利益が狙えます。',
        estimatedPrice: 8500
      };

      if (isLevis) {
        mockResult = { brandName: "Levi's", estimatedEra: '70年代前半', evidenceReason: 'バックポケットの赤タブが「Big E」、ボタン裏の刻印が「6」、すそがシングルステッチで仕上げられています。パッチは欠損していますが、デニムの縦落ちから70年代初頭の501と判定。', buyingGuide: 'buy' as const, buyingGuideReason: 'ヴィンテージデニムの価格は高騰しており、多少のダメージがあっても希少価値が高いです。', estimatedPrice: 35000 };
      } else if (isAdidas) {
        mockResult = { brandName: 'Adidas', estimatedEra: '00年代初期', evidenceReason: 'タグが万国旗タグであり、生産国はインドネシア。現行品に近いダブルステッチ仕上げですが、ロゴ刺繍の太さから00年代初期と推測されます。', buyingGuide: 'skip' as const, buyingGuideReason: '現行と大差ないデザインであり、相場的にも高値はつきにくいため、仕入れは見送るか極めて安価な場合のみ推奨します。', estimatedPrice: 2500 };
      }

      const { data: diagnoseData } = await adminSupabase
        .from('diagnoses')
        .insert({
          id: diagnoseId,
          user_id: user.id,
          brand_name: mockResult.brandName,
          estimated_era: mockResult.estimatedEra,
          evidence_reason: `${mockResult.evidenceReason}\n\n【仕入れ推奨理由】\n${mockResult.buyingGuideReason}`,
          overall_image_url: '/favicon.ico',
          tag_image_url: '/favicon.ico',
          buying_guide: mockResult.buyingGuide,
        })
        .select()
        .single();

      return NextResponse.json({ success: true, diagnoseId: diagnoseData.id, result: { ...mockResult, overallImageUrl: '/favicon.ico', tagImageUrl: '/favicon.ico', createdAt: diagnoseData.created_at } });
    }

    // 5. 画像をSupabase Storageにアップロード
    const overallUrl = await uploadBase64Image(overallImage, `diagnoses/${user.id}/${diagnoseId}_overall.jpg`);
    const tagUrl = await uploadBase64Image(tagImage, `diagnoses/${user.id}/${diagnoseId}_tag.jpg`);

    // 6. Vercel AI SDK + Zod による型安全な構造化出力（正規表現パース不要）
    const hintText = hintBrand ? `（ヒント：ユーザーはブランドを「${hintBrand}」と推測しています）` : '';

    const { object: aiResult } = await generateObject({
      model: anthropic('claude-3-5-sonnet-20241022'),
      schema: diagnosisSchema,
      system: `あなたは古着とヴィンテージ衣料の熟練鑑定士です。
提供された2枚の画像（1枚目：衣料の全体写真、2枚目：タグやロゴ・ディテール写真）を詳細に分析し、ブランド名、推定年代、鑑定根拠、仕入れガイド、および国内の推定相場価格を判定してください。
特に、タグのデザイン、ロゴのフォント、刺繍、縫製（シングルステッチ/ダブルステッチ等）、ジッパーのブランド（YKK, Talon等）、ケア表記の言語やマークから、客観的かつ詳細に年代を推計してください。`,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: `こちらの2枚の古着画像を鑑定してください。${hintText}` },
            { type: 'image', image: `data:${overallMime};base64,${cleanOverall}` },
            { type: 'image', image: `data:${tagMime};base64,${cleanTag}` },
          ]
        }
      ]
    });

    // 7. データベースへ保存
    const { data: diagnoseData, error: dbError } = await adminSupabase
      .from('diagnoses')
      .insert({
        id: diagnoseId,
        user_id: user.id,
        brand_name: aiResult.brandName,
        estimated_era: aiResult.estimatedEra,
        evidence_reason: `${aiResult.evidenceReason}\n\n【仕入れ推奨理由】\n${aiResult.buyingGuideReason}`,
        overall_image_url: overallUrl,
        tag_image_url: tagUrl,
        buying_guide: aiResult.buyingGuide
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database save error:', dbError);
      return NextResponse.json({ error: 'Failed to save diagnosis to database' }, { status: 500 });
    }

    // 価格ログを保存
    if (aiResult.estimatedPrice) {
      await adminSupabase.from('price_log').insert({
        brand_name: aiResult.brandName,
        era: aiResult.estimatedEra,
        price: aiResult.estimatedPrice,
        source: 'ai'
      });
    }

    return NextResponse.json({
      success: true,
      diagnoseId: diagnoseData.id,
      result: {
        brandName: aiResult.brandName,
        estimatedEra: aiResult.estimatedEra,
        evidenceReason: aiResult.evidenceReason,
        buyingGuide: aiResult.buyingGuide,
        buyingGuideReason: aiResult.buyingGuideReason,
        estimatedPrice: aiResult.estimatedPrice,
        overallImageUrl: overallUrl,
        tagImageUrl: tagUrl,
        createdAt: diagnoseData.created_at
      }
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Diagnose API error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
