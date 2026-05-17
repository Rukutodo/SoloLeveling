import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import ApiLog from '@/lib/models/ApiLog';

// Admin-only: returns aggregated log data for the dashboard
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = req.nextUrl;
    const range = parseInt(searchParams.get('range') || '24'); // hours
    const since = new Date(Date.now() - range * 60 * 60 * 1000);
    const userId = (session.user as any).id;

    // Run all aggregations in parallel
    const [
      recentLogs,
      totalCount,
      errorCount,
      aiCount,
      statusBreakdown,
      routeBreakdown,
      avgDuration,
      hourlyTimeline,
    ] = await Promise.all([
      // Last 50 log entries for this user
      ApiLog.find({ userId, timestamp: { $gte: since } })
        .sort({ timestamp: -1 })
        .limit(50)
        .lean(),

      // Total requests in range
      ApiLog.countDocuments({ userId, timestamp: { $gte: since } }),

      // Error count (4xx + 5xx)
      ApiLog.countDocuments({ userId, timestamp: { $gte: since }, statusCode: { $gte: 400 } }),

      // AI calls in last hour (for quota display)
      ApiLog.countDocuments({
        userId,
        type: 'ai',
        timestamp: { $gte: new Date(Date.now() - 3600000) },
        statusCode: { $lt: 500 },
      }),

      // Status code breakdown
      ApiLog.aggregate([
        { $match: { userId, timestamp: { $gte: since } } },
        { $group: { _id: '$statusCode', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),

      // Top routes by call count
      ApiLog.aggregate([
        { $match: { userId, timestamp: { $gte: since } } },
        { $group: { _id: '$route', count: { $sum: 1 }, errors: { $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] } }, avgDuration: { $avg: '$durationMs' } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      // Average response time
      ApiLog.aggregate([
        { $match: { userId, timestamp: { $gte: since } } },
        { $group: { _id: null, avg: { $avg: '$durationMs' }, maxDuration: { $max: '$durationMs' } } },
      ]),

      // Hourly request timeline (last 24h)
      ApiLog.aggregate([
        { $match: { userId, timestamp: { $gte: new Date(Date.now() - 86400000) } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%dT%H:00:00Z', date: '$timestamp' } },
            count: { $sum: 1 },
            errors: { $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    return NextResponse.json({
      summary: {
        totalRequests: totalCount,
        errorCount,
        errorRate: totalCount > 0 ? ((errorCount / totalCount) * 100).toFixed(1) : '0',
        aiCallsThisHour: aiCount,
        aiQuotaRemaining: Math.max(0, 30 - aiCount),
        avgDurationMs: avgDuration[0]?.avg ? Math.round(avgDuration[0].avg) : 0,
        maxDurationMs: avgDuration[0]?.maxDuration ?? 0,
      },
      recentLogs,
      statusBreakdown,
      routeBreakdown,
      hourlyTimeline,
    });
  } catch (error: any) {
    console.error('[Admin/Logs] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch logs' }, { status: 500 });
  }
}
