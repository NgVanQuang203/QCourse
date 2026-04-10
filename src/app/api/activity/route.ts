// GET /api/activity — Get heatmap data (364 days) + streak info for current user
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getVNDateStr } from '@/lib/utils/date';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const userId = session.user.id;

  // Get last 364 days of activity
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - 364);
  const sinceDateStr = getVNDateStr(sinceDate);

  const [activityLogs, user] = await Promise.all([
    prisma.activityLog.findMany({
      where:   { userId, date: { gte: sinceDateStr } },
      select:  { date: true, minutesStudied: true, cardsStudied: true, deckIds: true },
      orderBy: { date: 'asc' },
    }),
    prisma.user.findUnique({
      where:  { id: userId },
      select: { streak: true, maxStreak: true, lastActiveDate: true },
    }),
  ]);

  return Response.json({
    activity: activityLogs,
    streak:   user?.streak ?? 0,
    maxStreak: user?.maxStreak ?? 0,
  });
}
