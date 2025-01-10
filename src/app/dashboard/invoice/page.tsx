import Invoice from '@/components/Pdf/Invoice'
import React from 'react'

const page = () => {
  return (
    <div>
      <h1 className="text-center text-2xl font-bold mb-4">Invoice Page</h1>
      <Invoice/>
    </div>
  )
}

export default page
