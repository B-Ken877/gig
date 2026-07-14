import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth-middleware';

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin', 'operations']);

    // Talent statistics
    const agentStatusCounts = await db.agent.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const talentByStatus: Record<string, number> = {};
    let totalAgents = 0;
    for (const item of agentStatusCounts) {
      talentByStatus[item.status] = item._count.id;
      totalAgents += item._count.id;
    }

    // Recruitment statistics
    const appliedCount = talentByStatus['Applied'] || 0;
    const qualifiedCount = talentByStatus['Qualified'] || 0;
    const availableCount = talentByStatus['Available'] || 0;
    const workingCount = talentByStatus['Working'] || 0;
    const rejectedCount = talentByStatus['Rejected'] || 0;

    const approvalRate = appliedCount > 0 ? ((qualifiedCount + availableCount + workingCount) / totalAgents) * 100 : 0;
    const placementRate = totalAgents > 0 ? (workingCount / totalAgents) * 100 : 0;

    // Client statistics
    const clients = await db.client.findMany({
      include: {
        payments: { where: { status: 'Paid' } },
        placements: true,
      },
    });

    const activeClients = clients.length;

    const revenuePerClient = clients.map((client) => ({
      clientId: client.id,
      companyName: client.companyName,
      revenue: client.payments.reduce((sum, p) => sum + p.amount, 0),
      activePlacements: client.placements.filter((p) => p.status === 'Active').length,
    }));

    const totalClientRevenue = revenuePerClient.reduce((sum, c) => sum + c.revenue, 0);

    // Financial statistics
    const allPayments = await db.payment.findMany();
    const totalRevenue = allPayments
      .filter((p) => p.status === 'Paid')
      .reduce((sum, p) => sum + p.amount, 0);

    const outstandingInvoices = allPayments
      .filter((p) => p.status === 'Pending')
      .reduce((sum, p) => sum + p.amount, 0);

    const failedPayments = allPayments
      .filter((p) => p.status === 'Failed')
      .reduce((sum, p) => sum + p.amount, 0);

    const paymentHistorySummary = {
      total: allPayments.length,
      paid: allPayments.filter((p) => p.status === 'Paid').length,
      pending: allPayments.filter((p) => p.status === 'Pending').length,
      failed: allPayments.filter((p) => p.status === 'Failed').length,
    };

    // Contract expiration alerts
    const now = new Date();
    const sevenDays = new Date(Date.now() + 7 * 86400000);
    const fourteenDays = new Date(Date.now() + 14 * 86400000);
    const thirtyDays = new Date(Date.now() + 30 * 86400000);

    const [expiring7, expiring14, expiring30] = await Promise.all([
      db.contract.count({
        where: {
          status: 'Active',
          expirationDate: { lte: sevenDays, gte: now },
        },
      }),
      db.contract.count({
        where: {
          status: 'Active',
          expirationDate: { lte: fourteenDays, gte: now },
        },
      }),
      db.contract.count({
        where: {
          status: 'Active',
          expirationDate: { lte: thirtyDays, gte: now },
        },
      }),
    ]);

    const expiringContracts = await db.contract.findMany({
      where: {
        status: 'Active',
        expirationDate: { lte: thirtyDays, gte: now },
      },
      include: { client: { include: { user: true } } },
      orderBy: { expirationDate: 'asc' },
    });

    return NextResponse.json({
      talent: {
        totalAgents,
        byStatus: talentByStatus,
      },
      recruitment: {
        applications: appliedCount,
        qualified: qualifiedCount,
        available: availableCount,
        working: workingCount,
        rejected: rejectedCount,
        approvalRate: Math.round(approvalRate * 100) / 100,
        placementRate: Math.round(placementRate * 100) / 100,
      },
      client: {
        activeClients,
        revenuePerClient,
        totalClientRevenue,
      },
      financial: {
        totalRevenue,
        outstandingInvoices,
        failedPayments,
        paymentHistorySummary,
      },
      contractExpirations: {
        within7Days: expiring7,
        within14Days: expiring14,
        within30Days: expiring30,
        contracts: expiringContracts.map((c) => ({
          ...c,
          expirationDate: c.expirationDate ? c.expirationDate.toISOString() : null,
          startDate: c.startDate ? c.startDate.toISOString() : null,
          endDate: c.endDate ? c.endDate.toISOString() : null,
        })),
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Forbidden' ? 403 : 401 });
    }
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}