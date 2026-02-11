'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Calculator } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface InvoiceEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: InvoiceFormData) => Promise<void>;
  initialData?: InvoiceFormData;
  isLoading?: boolean;
}

export interface InvoiceFormData {
  lineItems: Omit<LineItem, 'id'>[];
  notes?: string;
  taxRate?: number;
  dueDate?: string;
}

export function InvoiceEditorDialog({
  open,
  onOpenChange,
  onSave,
  initialData,
  isLoading,
}: InvoiceEditorDialogProps) {
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', description: 'Professional fees', quantity: 1, unitPrice: 0 },
  ]);
  const [notes, setNotes] = useState('');
  const [taxRate, setTaxRate] = useState(18); // Default 18% GST
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (initialData) {
      setLineItems(
        initialData.lineItems.map((item, idx) => ({ ...item, id: String(idx + 1) }))
      );
      setNotes(initialData.notes || '');
      setTaxRate(initialData.taxRate || 18);
      setDueDate(initialData.dueDate || '');
    }
  }, [initialData, open]);

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { id: String(Date.now()), description: '', quantity: 1, unitPrice: 0 },
    ]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((item) => item.id !== id));
    }
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(
      lineItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  };

  const calculateTax = () => {
    return (calculateSubtotal() * taxRate) / 100;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleSave = async () => {
    await onSave({
      lineItems: lineItems.map(({ id, ...rest }) => rest),
      notes: notes || undefined,
      taxRate,
      dueDate: dueDate || undefined,
    });
  };

  const isValid = lineItems.every((item) => item.description && item.quantity > 0 && item.unitPrice >= 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invoice Details</DialogTitle>
          <DialogDescription>
            Add line items, configure tax, and set payment terms
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-semibold">Line Items</Label>
              <Button type="button" size="sm" variant="outline" onClick={addLineItem}>
                <Plus className="mr-1 h-4 w-4" />
                Add Item
              </Button>
            </div>

            <div className="space-y-3 border rounded-lg p-4 bg-muted/10">
              {lineItems.map((item, index) => (
                <div key={item.id} className="flex gap-3 items-start">
                  <div className="flex-1 grid grid-cols-12 gap-3">
                    {/* Description */}
                    <div className="col-span-6">
                      <Input
                        placeholder="Service description"
                        value={item.description}
                        onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                      />
                    </div>

                    {/* Quantity */}
                    <div className="col-span-2">
                      <Input
                        type="number"
                        placeholder="Qty"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(item.id, 'quantity', Number(e.target.value))}
                      />
                    </div>

                    {/* Unit Price */}
                    <div className="col-span-2">
                      <Input
                        type="number"
                        placeholder="Price"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateLineItem(item.id, 'unitPrice', Number(e.target.value))}
                      />
                    </div>

                    {/* Amount */}
                    <div className="col-span-2 flex items-center justify-end">
                      <span className="text-sm font-medium">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </span>
                    </div>
                  </div>

                  {/* Delete Button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLineItem(item.id)}
                    disabled={lineItems.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Tax Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tax Rate (%)</Label>
              <Select value={String(taxRate)} onValueChange={(v) => setTaxRate(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No Tax (0%)</SelectItem>
                  <SelectItem value="5">5%</SelectItem>
                  <SelectItem value="12">12%</SelectItem>
                  <SelectItem value="18">GST 18%</SelectItem>
                  <SelectItem value="28">28%</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Due Date (Optional)</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>Notes (Optional)</Label>
            <Textarea
              placeholder="Payment terms, additional information..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Totals Summary */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">{formatCurrency(calculateSubtotal())}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Tax ({taxRate}%):</span>
              <span className="font-medium">{formatCurrency(calculateTax())}</span>
            </div>
            <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span>{formatCurrency(calculateTotal())}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid || isLoading}>
            <Calculator className="mr-2 h-4 w-4" />
            {isLoading ? 'Saving...' : 'Save Invoice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
