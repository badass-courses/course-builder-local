'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, X } from 'lucide-react'

import {
	Badge,
	Button,
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@coursebuilder/ui'
import { cn } from '@coursebuilder/ui/utils/cn'
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
} from '../ui/primatives/command'
import { EggheadTag } from '../lib/tags'

export default function AdvancedTagSelector({
	availableTags,
	selectedTags: initialSelectedTags = [],
	onTagSelect = () => {},
	onTagRemove = () => {},
	onChange = () => {},
}: {
	availableTags: EggheadTag[]
	selectedTags: EggheadTag[]
	onTagSelect?: (tag: EggheadTag) => void
	onTagRemove?: (tagId: string) => void
	onChange?: (tags: EggheadTag[]) => void
}) {
	const [open, setOpen] = React.useState(false)
	const [selectedTags, setSelectedTags] =
		React.useState<EggheadTag[]>(initialSelectedTags)
	const [inputValue, setInputValue] = React.useState('')

	// Sync local state with prop changes
	// React.useEffect(() => {
	// 	setSelectedTags(initialSelectedTags)
	// }, [initialSelectedTags])

	console.log({ availableTags, selectedTags })

	const handleTagSelect = (tag: EggheadTag) => {
		const newTags = selectedTags.some((t) => t.id === tag.id)
			? selectedTags.filter((t) => t.id !== tag.id)
			: [...selectedTags, tag]

		setSelectedTags(newTags)
		onChange(newTags)
		onTagSelect(tag)
	}

	const handleTagRemove = (tagId: string) => {
		const newTags = selectedTags.filter((tag) => tag.id !== tagId)
		setSelectedTags(newTags)
		onChange(newTags)
		onTagRemove(tagId)
	}

	const filteredTags = React.useMemo(() => {
		if (!inputValue.trim()) {
			// Show popular tags when input is empty
			return availableTags
				.slice()
				.sort(
					(a, b) =>
						(a.fields.popularity_order || Infinity) -
						(b.fields.popularity_order || Infinity),
				)
				.slice(0, 10)
		}

		// Otherwise show search results
		return availableTags.filter((tag) =>
			tag.fields.label.toLowerCase().includes(inputValue.toLowerCase()),
		)
	}, [availableTags, inputValue])

	console.log({ filteredTags })

	return (
		<div className="w-full space-y-3">
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						role="combobox"
						aria-expanded={open}
						className="border-input bg-input text-input-foreground hover:bg-input hover:text-foreground flex w-full items-center justify-between px-4 py-2.5"
					>
						<span className="inline-flex items-center">
							{selectedTags.length > 0
								? `${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''} selected`
								: 'Select tags...'}
						</span>
						<ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
					</Button>
				</PopoverTrigger>
				<PopoverContent
					className="border-ui-border bg-background w-full rounded-sm border p-0 shadow-[0_0_8px_rgba(0,0,0,0.24)]"
					align="start"
					sideOffset={4}
				>
					<Command className="border-none bg-transparent">
						<CommandInput
							placeholder="Search tags..."
							value={inputValue}
							onValueChange={setInputValue}
							className="border-ui-border bg-input text-input-foreground border-b [&>input::-webkit-calendar-picker-indicator]:hidden [&>input]:appearance-none"
						/>
						<CommandEmpty className="text-muted-foreground px-3 py-3">
							No tags found.
						</CommandEmpty>
						<CommandGroup className="scrollbar-thin scrollbar-thumb-secondary/10 scrollbar-track-transparent max-h-[280px] overflow-auto">
							{filteredTags.map((tag) => (
								<CommandItem
									key={tag.id}
									onSelect={() => handleTagSelect(tag)}
									className="hover:bg-secondary/10 flex cursor-pointer items-center justify-between px-3 py-2"
								>
									<div className="flex flex-col">
										<span className="text-foreground">{tag.fields.label}</span>
										<span className="text-muted-foreground text-xs">
											{tag.fields.name}
										</span>
									</div>
									<Check
										className={cn(
											'text-accent h-4 w-4',
											selectedTags.some((t) => t.id === tag.id)
												? 'opacity-100'
												: 'opacity-0',
										)}
									/>
								</CommandItem>
							))}
						</CommandGroup>
					</Command>
				</PopoverContent>
			</Popover>

			<div className="flex flex-wrap gap-2" aria-live="polite">
				{selectedTags.map((tag) => (
					<Badge
						key={tag.id}
						variant="secondary"
						className="bg-secondary/15 text-foreground border-ui-border border px-2 py-0.5 text-sm"
					>
						{tag.fields.label}
						<button
							className="hover:bg-secondary/20 focus:ring-ring ml-1 rounded-full outline-none focus:ring-1"
							onClick={() => handleTagRemove(tag.id)}
							aria-label={`Remove ${tag.fields.label} tag`}
						>
							<X className="h-3 w-3" />
						</button>
					</Badge>
				))}
			</div>
		</div>
	)
}
