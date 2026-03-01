'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase, Party } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Search, Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface PartySearchProps {
  value: string
  onChange: (partyId: number | null, partyName: string) => void
  placeholder?: string
  required?: boolean
}

export function PartySearch({ value, onChange, placeholder = "Party Name (M/s.)", required = false }: PartySearchProps) {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState(value)
  const [parties, setParties] = useState<Party[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newPartyName, setNewPartyName] = useState('')
  const [newPartyGst, setNewPartyGst] = useState('')
  const [creating, setCreating] = useState(false)

  // Search parties when search value changes
  const searchParties = useCallback(async (query: string) => {
    if (query.length < 2) {
      setParties([])
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('parties')
        .select('*')
        .ilike('name', `%${query}%`)
        .limit(5)

      if (error) throw error
      setParties(data || [])
    } catch (error) {
      console.error('Error searching parties:', error)
      toast.error('Failed to search parties')
      setParties([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchParties(searchValue)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchValue, searchParties])

  const handleSelectParty = (party: Party) => {
    setSearchValue(party.name)
    onChange(party.id, party.name)
    setOpen(false)
    toast.success(`Selected party: ${party.name}`)
  }

  const handleCreateParty = async () => {
    if (!newPartyName.trim()) {
      toast.error('Party name is required')
      return
    }

    // Capitalize each word in the party name
    const capitalizedName = newPartyName.trim().toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())

    setCreating(true)
    try {
      // Try to create party directly in the database
      const { data, error } = await supabase
        .from('parties')
        .insert([{
          party_id: `PYT${Date.now().toString().slice(-3).padStart(3, '0')}`, // Simple ID generation
          name: capitalizedName,
          gst_number: newPartyGst.trim() || null
        }])
        .select()
        .single()

      if (error) throw error

      const createdParty = data
      setSearchValue(createdParty.name)
      onChange(createdParty.id, createdParty.name)
      setDialogOpen(false)
      setNewPartyName('')
      setNewPartyGst('')
      setOpen(false)
      toast.success(`Created and selected party: ${createdParty.name}`)
    } catch (error: any) {
      console.error('Error creating party:', error)
      if (error.message?.includes('duplicate key') || error.code === '23505') {
        toast.error('Party with this name already exists')
      } else {
        toast.error('Failed to create party - please try again')
      }
    } finally {
      setCreating(false)
    }
  }
  const handleCreateOption = () => {
    setNewPartyName(searchValue)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm md:text-base font-semibold">
        Party Name (M/s.){required && <span className="text-red-500 ml-1">*</span>}
      </Label>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild suppressHydrationWarning>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between text-left font-normal"
          >
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 shrink-0 opacity-50" />
              <span className={searchValue ? "text-foreground" : "text-muted-foreground"}>
                {searchValue || placeholder}
              </span>
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search parties..."
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              {loading && (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="ml-2">Searching...</span>
                </div>
              )}

              {!loading && parties.length === 0 && searchValue.length >= 2 && (
                <CommandEmpty>
                  <div className="p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      No parties found for "{searchValue}"
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCreateOption}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create "{searchValue}"
                    </Button>
                  </div>
                </CommandEmpty>
              )}

              {!loading && parties.length > 0 && (
                <CommandGroup>
                  {parties.map((party) => (
                    <CommandItem
                      key={party.id}
                      value={party.name}
                      onSelect={() => handleSelectParty(party)}
                      className="flex flex-col items-start p-3"
                    >
                      <div className="font-medium">{party.name}</div>
                      {party.gst_number && (
                        <div className="text-xs text-muted-foreground">
                          GST: {party.gst_number}
                        </div>
                      )}
                    </CommandItem>
                  ))}
                  <CommandItem
                    onSelect={handleCreateOption}
                    className="border-t mt-2 pt-3"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create "{searchValue}"
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Create Party Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent suppressHydrationWarning>
          <DialogHeader>
            <DialogTitle>Create New Party</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="party-name">Party Name *</Label>
              <Input
                id="party-name"
                placeholder="Enter party name"
                value={newPartyName}
                onChange={(e) => setNewPartyName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateParty()
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="party-gst">GST Number (Optional)</Label>
              <Input
                id="party-gst"
                placeholder="e.g., 27ABCDE1234F1Z5"
                value={newPartyGst}
                onChange={(e) => setNewPartyGst(e.target.value.toUpperCase())}
                maxLength={15}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateParty}
                disabled={creating || !newPartyName.trim()}
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Party'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
