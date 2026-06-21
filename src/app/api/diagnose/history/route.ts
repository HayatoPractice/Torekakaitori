import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // ユーザー認証の確認
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 診断履歴を取得 (最新順)
    const { data: diagnoses, error } = await supabase
      .from('diagnoses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch history error:', error);
      return NextResponse.json({ error: 'Database error fetching history' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      diagnoses
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('History API error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
