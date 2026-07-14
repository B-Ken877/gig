import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const request = await db.staffingRequest.findUnique({
      where: { id },
      include: {
        client: { include: { user: true } },
        placements: { include: { agent: { include: { user: true } } } },
      },
    });

    if (!request) {
      return NextResponse.json({ error: 'Staffing request not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...request,
      languages: JSON.parse(request.languages),
      startDate: request.startDate ? request.startDate.toISOString() : null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existingRequest = await db.staffingRequest.findUnique({ where: { id } });
    if (!existingRequest) {
      return NextResponse.json({ error: 'Staffing request not found' }, { status: 404 });
    }

    const oldStatus = existingRequest.status;

    const updateData: Record<string, unknown> = {};
    const updatableFields = [
      'title', 'numberOfAgents', 'experienceRequired',
      'shift', 'department', 'salaryMin', 'salaryMax',
      'specialRequirements', 'status',
    ];

    for (const field of updatableFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (body.startDate !== undefined) {
      updateData.startDate = body.startDate ? new Date(body.startDate) : null;
    }

    if (body.languages !== undefined) {
      updateData.languages = JSON.stringify(body.languages);
    }

    const updatedRequest = await db.staffingRequest.update({
      where: { id },
      data: updateData,
      include: { client: { include: { user: true } } },
    });

    if (body.status && body.status !== oldStatus) {
      await db.auditLog.create({
        data: {
          action: 'REQUEST_STATUS_CHANGE',
          entity: 'StaffingRequest',
          entityId: id,
          details: `Staffing request "${existingRequest.title}" status changed from "${oldStatus}" to "${body.status}"`,
        },
      });

      // ─── Auto-generate invoice when request is Approved or Filled ──
      if (
        (body.status === 'Approved' || body.status === 'Filled') &&
        existingRequest.clientId
      ) {
        // Check if a pending "Client Invoice" already exists for this request
        const existingInvoice = await db.payment.findFirst({
          where: {
            clientId: existingRequest.clientId,
            type: 'Client Invoice',
            status: 'Pending',
            description: {
              contains: existingRequest.title,
            },
          },
        });

        if (!existingInvoice) {
          // Calculate amount: salaryMin * numberOfAgents, or flat fee of $500/agent
          const perAgentFee = existingRequest.salaryMin
            ? Number(existingRequest.salaryMin)
            : 500;
          const totalAmount = perAgentFee * existingRequest.numberOfAgents;

          // Generate invoice number: GS-YYYYMMDD-XXXX
          const now = new Date();
          const datePart =
            now.getFullYear().toString() +
            String(now.getMonth() + 1).padStart(2, '0') +
            String(now.getDate()).padStart(2, '0');
          const seqPart = String(now.getTime()).slice(-6);
          const invoiceNumber = `GS-${datePart}-${seqPart}`;

          // Due date: 30 days from now
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 30);

          await db.payment.create({
            data: {
              clientId: existingRequest.clientId,
              amount: totalAmount,
              method: 'MoCash',
              type: 'Client Invoice',
              status: 'Pending',
              dueDate,
              description: `Staffing fee for: ${existingRequest.title}`,
              invoiceNumber,
            },
          });
        }
      }
    }

    return NextResponse.json({
      ...updatedRequest,
      languages: JSON.parse(updatedRequest.languages),
      startDate: updatedRequest.startDate ? updatedRequest.startDate.toISOString() : null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}