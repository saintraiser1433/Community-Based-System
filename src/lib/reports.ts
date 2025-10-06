import jsPDF from 'jspdf'
import * as XLSX from 'xlsx'

export interface ReportData {
  title: string
  date: string
  data: any[]
  summary?: {
    total: number
    [key: string]: any
  }
}

export class ReportGenerator {
  static generatePDF(data: ReportData): Blob {
    try {
      console.log('🔄 Creating PDF document...')
      console.log('📊 Input data validation:', {
        hasTitle: !!data.title,
        hasDate: !!data.date,
        hasData: !!data.data,
        dataLength: data.data?.length || 0,
        hasSummary: !!data.summary
      })
      
      // Validate required fields
      if (!data.title || !data.date) {
        throw new Error('Missing required fields: title and date are required')
      }
      
      const doc = new jsPDF()
      console.log('✅ PDF document created')
      
      // Header
      doc.setFontSize(20)
      doc.text('MSWDO-GLAN Community Based Donation and Management System', 20, 20)
      doc.setFontSize(16)
      doc.text(data.title, 20, 35)
      doc.setFontSize(12)
      doc.text(`Generated on: ${data.date}`, 20, 45)
      
      // Summary
      let yPos = 60
      if (data.summary) {
        doc.setFontSize(14)
        doc.text('Summary', 20, yPos)
        doc.setFontSize(10)
        yPos += 10
        Object.entries(data.summary).forEach(([key, value]) => {
          doc.text(`${key}: ${value}`, 20, yPos)
          yPos += 10
        })
      }
      
      // Data table
      if (data.data && data.data.length > 0) {
        console.log('📊 Adding data table with', data.data.length, 'rows')
        doc.setFontSize(14)
        doc.text('Details', 20, yPos + 10)
        
        // Simple table implementation
        let tableY = yPos + 20
        const headers = Object.keys(data.data[0])
        console.log('📋 Table headers:', headers)
        
        // Headers
        doc.setFontSize(10)
        doc.setFont(undefined, 'bold')
        headers.forEach((header, index) => {
          doc.text(header, 20 + (index * 40), tableY)
        })
        
        // Data rows
        doc.setFont(undefined, 'normal')
        data.data.slice(0, 20).forEach((row, rowIndex) => {
          // Check if we need a new page
          if (tableY > 250) {
            doc.addPage()
            tableY = 20
            // Redraw headers on new page
            doc.setFont(undefined, 'bold')
            headers.forEach((header, index) => {
              doc.text(header, 20 + (index * 40), tableY)
            })
            doc.setFont(undefined, 'normal')
            tableY += 10
          }
          
          tableY += 10
          headers.forEach((header, colIndex) => {
            const value = row[header] || ''
            doc.text(String(value).substring(0, 15), 20 + (colIndex * 40), tableY)
          })
        })
        console.log('✅ Data table completed')
      } else {
        console.log('⚠️ No data to display in PDF')
      }
      
      console.log('🔄 Generating PDF blob...')
      const blob = doc.output('blob')
      console.log('✅ PDF blob generated successfully:', blob.size, 'bytes')
      return blob
    } catch (error) {
      console.error('Error generating PDF:', error)
      throw new Error('Failed to generate PDF report')
    }
  }
  
  static generateExcel(data: ReportData): Blob {
    try {
      console.log('🔄 Creating Excel workbook...')
      const workbook = XLSX.utils.book_new()
      console.log('✅ Excel workbook created')
      
      // Add summary sheet if available
      if (data.summary) {
        console.log('📊 Adding summary sheet...')
        const summarySheet = XLSX.utils.json_to_sheet([data.summary])
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')
        console.log('✅ Summary sheet added')
      }
      
      // Add data sheet
      if (data.data && data.data.length > 0) {
        console.log('📊 Adding data sheet with', data.data.length, 'rows...')
        const worksheet = XLSX.utils.json_to_sheet(data.data)
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Data')
        console.log('✅ Data sheet added')
      } else {
        console.log('⚠️ No data to display, creating empty sheet...')
        // Create empty sheet if no data
        const emptySheet = XLSX.utils.json_to_sheet([{ 'No Data': 'No records found' }])
        XLSX.utils.book_append_sheet(workbook, emptySheet, 'Data')
        console.log('✅ Empty sheet added')
      }
      
      console.log('🔄 Converting workbook to ArrayBuffer...')
      const arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      console.log('✅ ArrayBuffer generated:', arrayBuffer.byteLength, 'bytes')
      
      // Validate ArrayBuffer
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('Failed to generate Excel data - empty ArrayBuffer')
      }
      
      console.log('✅ ArrayBuffer validation passed')
      
      console.log('🔄 Converting ArrayBuffer to Blob...')
      try {
        const blob = new Blob([arrayBuffer], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        })
        console.log('✅ Blob created:', blob.size, 'bytes')
        return blob
      } catch (blobError) {
        console.warn('⚠️ Blob creation failed, trying alternative method...', blobError)
        // Fallback: try with different MIME type
        const blob = new Blob([arrayBuffer], { 
          type: 'application/vnd.ms-excel' 
        })
        console.log('✅ Blob created with fallback method:', blob.size, 'bytes')
        return blob
      }
    } catch (error) {
      console.error('❌ Error generating Excel:', error)
      throw new Error('Failed to generate Excel report')
    }
  }
  
  static downloadPDF(data: ReportData, filename: string) {
    try {
      console.log('🔄 Generating PDF for:', filename)
      console.log('📊 Data structure:', { 
        title: data.title, 
        date: data.date, 
        dataLength: data.data?.length || 0,
        hasSummary: !!data.summary 
      })
      
      const blob = this.generatePDF(data)
      console.log('✅ PDF blob generated:', blob.size, 'bytes')
      
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${filename}.pdf`
      link.click()
      URL.revokeObjectURL(url)
      
      console.log('✅ PDF download initiated')
    } catch (error) {
      console.error('❌ Error downloading PDF:', error)
      console.error('❌ Error details:', error.message)
      alert(`Failed to generate PDF report: ${error.message}`)
    }
  }
  
  static downloadExcel(data: ReportData, filename: string) {
    try {
      console.log('🔄 Generating Excel for:', filename)
      console.log('📊 Data structure:', { 
        title: data.title, 
        date: data.date, 
        dataLength: data.data?.length || 0,
        hasSummary: !!data.summary 
      })
      
      const blob = this.generateExcel(data)
      console.log('✅ Excel blob generated:', blob.size, 'bytes')
      console.log('📋 Blob type:', blob.type)
      
      console.log('🔄 Creating object URL...')
      const url = URL.createObjectURL(blob)
      console.log('✅ Object URL created:', url)
      
      console.log('🔄 Creating download link...')
      const link = document.createElement('a')
      link.href = url
      link.download = `${filename}.xlsx`
      link.style.display = 'none'
      document.body.appendChild(link)
      
      console.log('🔄 Triggering download...')
      link.click()
      
      console.log('🔄 Cleaning up...')
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      console.log('✅ Excel download initiated successfully')
    } catch (error) {
      console.error('❌ Error downloading Excel:', error)
      console.error('❌ Error details:', error.message)
      console.error('❌ Error stack:', error.stack)
      alert(`Failed to generate Excel report: ${error.message}`)
    }
  }
}
