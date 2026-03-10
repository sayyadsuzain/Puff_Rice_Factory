import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X } from 'lucide-react'
import { BillItem, FIXED_PRODUCTS } from '@/lib/supabase'
import { useState, useEffect } from 'react'

interface BillItemFormProps {
  index: number
  item: Partial<BillItem>
  onUpdate: (item: Partial<BillItem>) => void
  onRemove: () => void
}

export default function BillItemForm({ index, item, onUpdate, onRemove }: BillItemFormProps) {
  const [isPaddyMode, setIsPaddyMode] = useState(false)

  // Check if current item is paddy
  useEffect(() => {
    const isPaddy = item.particular?.toLowerCase().includes('paddy') || false
    setIsPaddyMode(isPaddy)
  }, [item.particular])

  const handleParticularChange = (value: string) => {
    const isPaddy = value.toLowerCase().includes('paddy')
    setIsPaddyMode(isPaddy)
    onUpdate({ ...item, particular: value })
  }

  const handleQtyChange = (value: string) => {
    const qty_bags = value ? parseInt(value) : undefined
    const newItem = { ...item, qty_bags }

    // Auto-calculate amount based on paddy mode
    if (qty_bags && newItem.rate) {
      if (isPaddyMode) {
        // PADDY FORMULA: Weight × Rate (total weight × rate per kg)
        // Qty is optional for paddy, mainly for reference
        if (newItem.weight_kg) {
          newItem.amount = newItem.weight_kg * newItem.rate
        }
      } else {
        // STANDARD FORMULA: Qty × Rate
        newItem.amount = qty_bags * newItem.rate
      }
    }

    onUpdate(newItem)
  }

  const handleWeightChange = (value: string) => {
    const weight_kg = value ? parseFloat(value) : undefined
    const newItem = { ...item, weight_kg }

    // Auto-calculate amount for paddy: Weight × Rate
    if (isPaddyMode && weight_kg && newItem.rate) {
      newItem.amount = weight_kg * newItem.rate
    }

    onUpdate(newItem)
  }

  const handleRateChange = (value: string) => {
    const rate = value ? parseFloat(value) : undefined
    const newItem = { ...item, rate }

    // Auto-calculate amount based on paddy mode
    if (rate) {
      if (isPaddyMode && newItem.weight_kg) {
        // PADDY FORMULA: Weight × Rate
        newItem.amount = newItem.weight_kg * rate
      } else if (!isPaddyMode && newItem.qty_bags) {
        // STANDARD FORMULA: Qty × Rate
        newItem.amount = newItem.qty_bags * rate
      }
    }

    onUpdate(newItem)
  }

  const handleAmountChange = (value: string) => {
    onUpdate({ ...item, amount: value ? parseFloat(value) : undefined })
  }

  return (
    <Card className="p-3 md:p-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 md:gap-4">
        <div className="flex-1 space-y-3">
          {/* Product/Particular */}
          <div className="space-y-2">
            <Label className="text-xs md:text-sm">Product (Type or Select)</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={item.particular === undefined ? '' : item.particular} onValueChange={handleParticularChange}>
                <SelectTrigger className="flex-1 text-sm md:text-base">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {FIXED_PRODUCTS.map(product => (
                    <SelectItem key={product} value={product}>
                      {product}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Custom"
                value={item.particular || ''}
                onChange={(e) => handleParticularChange(e.target.value)}
                className="flex-1 text-sm md:text-base"
              />
            </div>
          </div>

          {/* Quantity and Weight */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs md:text-sm">QTY (Bags)</Label>
              <Input
                type="number"
                placeholder="0"
                value={item.qty_bags || ''}
                onChange={(e) => handleQtyChange(e.target.value)}
                min="0"
                className="text-sm md:text-base"
              />
            </div>
            <div className="space-y-2">
              <Label className={`text-xs md:text-sm ${isPaddyMode ? 'font-semibold text-blue-600' : ''}`}>
                Weight (kg) {isPaddyMode && <span className="text-red-500">*</span>}
              </Label>
              <Input
                type="number"
                placeholder={isPaddyMode ? "25.5" : "0.00"}
                value={item.weight_kg || ''}
                onChange={(e) => handleWeightChange(e.target.value)}
                step="0.01"
                min="0"
                className={`text-sm md:text-base ${isPaddyMode ? 'border-blue-500 bg-blue-50' : ''}`}
                required={isPaddyMode}
              />
              {isPaddyMode && (
                <p className="text-xs text-blue-600">Required for paddy calculation</p>
              )}
            </div>
          </div>

          {/* Rate and Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className={`text-xs md:text-sm ${isPaddyMode ? 'font-semibold text-blue-600' : ''}`}>
                Rate ({isPaddyMode ? '₹/kg' : '₹'})
              </Label>
              <Input
                type="number"
                placeholder={isPaddyMode ? "35.00" : "0.00"}
                value={item.rate || ''}
                onChange={(e) => handleRateChange(e.target.value)}
                step="0.01"
                min="0"
                className={`text-sm md:text-base ${isPaddyMode ? 'border-blue-500 bg-blue-50' : ''}`}
              />
              {isPaddyMode && (
                <p className="text-xs text-blue-600">Price per kg of paddy</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs md:text-sm">Amount (₹)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={item.amount || ''}
                onChange={(e) => handleAmountChange(e.target.value)}
                step="0.01"
                min="0"
                className="text-sm md:text-base bg-gray-50"
              />
              {isPaddyMode && item.weight_kg && item.rate && (
                <p className="text-xs text-green-600">
                  Formula: {item.weight_kg}kg × ₹{item.rate}/kg = ₹{item.amount?.toFixed(2)}
                </p>
              )}
              {!isPaddyMode && item.qty_bags && item.rate && (
                <p className="text-xs text-green-600">
                  Formula: {item.qty_bags} × {item.rate} = ₹{item.amount?.toFixed(2)}
                </p>
              )}
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="self-start sm:self-center h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  )
}
