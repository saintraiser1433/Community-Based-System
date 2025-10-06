import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Donation reports API called')
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      console.log('❌ No session found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      console.log('❌ User is not admin:', session.user.role)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    console.log('✅ Admin user authenticated:', session.user.email)

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'
    const barangayId = searchParams.get('barangayId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build where clause
    const where: any = {}
    if (barangayId) {
      where.barangayId = barangayId
    }
    if (startDate || endDate) {
      where.claimedAt = {}
      if (startDate) where.claimedAt.gte = new Date(startDate)
      if (endDate) where.claimedAt.lte = new Date(endDate)
    }

    // Get claims data
    console.log('🔍 Fetching claims data...')
    const claims = await prisma.claim.findMany({
      where,
      include: {
        schedule: true,
        family: {
          include: {
            head: true
          }
        },
        claimedByUser: true,
        barangay: true
      },
      orderBy: {
        claimedAt: 'desc'
      }
    })
    console.log('✅ Claims fetched:', claims.length)

    // Get summary statistics
    console.log('🔍 Fetching summary statistics...')
    const totalClaims = claims.length
    const totalSchedules = await prisma.donationSchedule.count({
      where: barangayId ? { barangayId } : {}
    })
    const totalFamilies = await prisma.family.count({
      where: barangayId ? { barangayId } : {}
    })
    console.log('✅ Summary stats:', { totalClaims, totalSchedules, totalFamilies })

    const reportData = {
      title: 'Donation Distribution Report',
      date: new Date().toLocaleDateString(),
      data: claims.length > 0 ? claims.map(claim => ({
        'Schedule Title': claim.schedule?.title || 'N/A',
        'Family Head': `${claim.family?.head?.firstName || ''} ${claim.family?.head?.lastName || ''}`.trim(),
        'Claimed By': `${claim.claimedByUser?.firstName || ''} ${claim.claimedByUser?.lastName || ''}`.trim(),
        'Barangay': claim.barangay?.name || 'N/A',
        'Claim Date': new Date(claim.claimedAt).toLocaleDateString(),
        'Status': claim.status,
        'Notes': claim.notes || 'N/A'
      })) : [{
        'Schedule Title': 'No Data',
        'Family Head': 'No Claims Found',
        'Claimed By': 'N/A',
        'Barangay': 'N/A',
        'Claim Date': 'N/A',
        'Status': 'N/A',
        'Notes': 'No donation claims found in the system'
      }],
      summary: {
        'Total Claims': totalClaims,
        'Total Schedules': totalSchedules,
        'Total Families': totalFamilies,
        'Report Period': startDate && endDate ? `${startDate} to ${endDate}` : 'All Time'
      }
    }

    if (format === 'json') {
      return NextResponse.json(reportData)
    }

    // For PDF/Excel, we'll return the data and let the frontend handle the download
    return NextResponse.json(reportData)
  } catch (error) {
    console.error('Error generating donation report:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
