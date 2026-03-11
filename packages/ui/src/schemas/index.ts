import { z } from 'zod';

// ── Form components ───────────────────────────────────────────────────────────

export const ButtonSchema = z.object({
    variant: z.enum(['primary', 'secondary', 'ghost', 'danger', 'link']).optional(),
    size: z.enum(['xs', 'sm', 'md', 'lg']).optional(),
    asChild: z.boolean().optional(),
    loading: z.boolean().optional(),
    disabled: z.boolean().optional(),
    className: z.string().optional(),
});

export const InputSchema = z.object({
    variant: z.enum(['outline', 'filled', 'ghost']).optional(),
    inputSize: z.enum(['sm', 'md', 'lg']).optional(),
    status: z.enum(['default', 'error', 'success']).optional(),
    disabled: z.boolean().optional(),
    className: z.string().optional(),
});

export const TextareaSchema = z.object({
    state: z.enum(['default', 'error', 'success']).optional(),
    disabled: z.boolean().optional(),
    className: z.string().optional(),
});

export const CheckboxSchema = z.object({
    size: z.enum(['sm', 'md', 'lg']).optional(),
    checked: z.boolean().optional(),
    indeterminate: z.boolean().optional(),
    disabled: z.boolean().optional(),
    label: z.string().optional(),
    description: z.string().optional(),
    className: z.string().optional(),
});

export const RadioGroupSchema = z.object({
    orientation: z.enum(['horizontal', 'vertical']).optional(),
    size: z.enum(['sm', 'md', 'lg']).optional(),
    className: z.string().optional(),
});

export const SelectSchema = z.object({
    size: z.enum(['sm', 'md', 'lg']).optional(),
    variant: z.enum(['outline', 'filled', 'ghost']).optional(),
    disabled: z.boolean().optional(),
    placeholder: z.string().optional(),
    searchable: z.boolean().optional(),
    clearable: z.boolean().optional(),
    className: z.string().optional(),
});

export const SwitchSchema = z.object({
    size: z.enum(['sm', 'md', 'lg']).optional(),
    checked: z.boolean().optional(),
    disabled: z.boolean().optional(),
    label: z.string().optional(),
    description: z.string().optional(),
    className: z.string().optional(),
});

// ── Display components ────────────────────────────────────────────────────────

export const BadgeSchema = z.object({
    intent: z.enum(['primary', 'success', 'warning', 'error', 'neutral']).optional(),
    size: z.enum(['sm', 'md', 'lg']).optional(),
    dot: z.boolean().optional(),
    className: z.string().optional(),
});

export const AlertSchema = z.object({
    variant: z.enum(['info', 'success', 'warning', 'error']).optional(),
    title: z.string().optional(),
    dismissible: z.boolean().optional(),
    icon: z.boolean().optional(),
    className: z.string().optional(),
});

export const AvatarSchema = z.object({
    size: z.enum(['xs', 'sm', 'md', 'lg', 'xl']).optional(),
    shape: z.enum(['circle', 'square', 'rounded']).optional(),
    src: z.string().url().optional(),
    alt: z.string().optional(),
    fallback: z.string().optional(),
    status: z.enum(['online', 'offline', 'busy', 'away']).optional(),
    className: z.string().optional(),
});

export const CardSchema = z.object({
    elevation: z.enum(['flat', 'raised', 'floating', 'modal']).optional(),
    padding: z.enum(['none', 'sm', 'md', 'lg', 'xl']).optional(),
    interactive: z.boolean().optional(),
    className: z.string().optional(),
});

export const HeadingSchema = z.object({
    as: z.enum(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']).optional(),
    size: z.enum(['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl']).optional(),
    weight: z.enum(['light', 'regular', 'medium', 'semibold', 'bold']).optional(),
    color: z.enum(['primary', 'secondary', 'muted', 'inverted', 'accent']).optional(),
    gradient: z.boolean().optional(),
    className: z.string().optional(),
});

export const TextSchema = z.object({
    as: z.enum(['p', 'span', 'div', 'label', 'small', 'strong', 'em']).optional(),
    size: z.enum(['xs', 'sm', 'md', 'lg', 'xl']).optional(),
    weight: z.enum(['light', 'regular', 'medium', 'semibold', 'bold']).optional(),
    color: z.enum(['primary', 'secondary', 'muted', 'inverted', 'accent', 'success', 'warning', 'error']).optional(),
    truncate: z.boolean().optional(),
    lineClamp: z.number().int().positive().optional(),
    className: z.string().optional(),
});

export const IconSchema = z.object({
    name: z.string(),
    size: z.enum(['xs', 'sm', 'md', 'lg', 'xl']).optional(),
    color: z.enum(['primary', 'secondary', 'muted', 'accent', 'success', 'warning', 'error', 'current']).optional(),
    className: z.string().optional(),
});

export const ProgressSchema = z.object({
    value: z.number().min(0).max(100).optional(),
    size: z.enum(['xs', 'sm', 'md', 'lg']).optional(),
    variant: z.enum(['linear', 'circular']).optional(),
    intent: z.enum(['primary', 'success', 'warning', 'error']).optional(),
    animated: z.boolean().optional(),
    showLabel: z.boolean().optional(),
    className: z.string().optional(),
});

export const SpinnerSchema = z.object({
    size: z.enum(['xs', 'sm', 'md', 'lg', 'xl']).optional(),
    color: z.enum(['primary', 'white', 'current']).optional(),
    className: z.string().optional(),
});

export const SeparatorSchema = z.object({
    orientation: z.enum(['horizontal', 'vertical']).optional(),
    decorative: z.boolean().optional(),
    className: z.string().optional(),
});

// ── Navigation components ─────────────────────────────────────────────────────

export const TabsSchema = z.object({
    variant: z.enum(['line', 'enclosed', 'pills', 'unstyled']).optional(),
    size: z.enum(['sm', 'md', 'lg']).optional(),
    orientation: z.enum(['horizontal', 'vertical']).optional(),
    fullWidth: z.boolean().optional(),
    className: z.string().optional(),
});

export const AccordionSchema = z.object({
    type: z.enum(['single', 'multiple']).optional(),
    collapsible: z.boolean().optional(),
    className: z.string().optional(),
});

export const DropdownMenuSchema = z.object({
    dir: z.enum(['ltr', 'rtl']).optional(),
    modal: z.boolean().optional(),
});

export const TooltipSchema = z.object({
    side: z.enum(['top', 'right', 'bottom', 'left']).optional(),
    align: z.enum(['start', 'center', 'end']).optional(),
    delayDuration: z.number().optional(),
    content: z.string().optional(),
    className: z.string().optional(),
});

// ── Overlay components ────────────────────────────────────────────────────────

export const ModalSchema = z.object({
    size: z.enum(['sm', 'md', 'lg', 'xl', 'full']).optional(),
    open: z.boolean().optional(),
    closeOnOverlay: z.boolean().optional(),
    closeOnEscape: z.boolean().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    className: z.string().optional(),
});

// ── Layout components ─────────────────────────────────────────────────────────

export const BoxSchema = z.object({
    as: z.string().optional(),
    padding: z.enum(['none', 'xs', 'sm', 'md', 'lg', 'xl', '2xl']).optional(),
    margin: z.enum(['none', 'xs', 'sm', 'md', 'lg', 'xl', 'auto']).optional(),
    borderRadius: z.enum(['none', 'sm', 'md', 'lg', 'xl', 'full']).optional(),
    background: z.enum(['transparent', 'surface', 'elevated', 'overlay', 'accent']).optional(),
    className: z.string().optional(),
});

export const FlexSchema = z.object({
    direction: z.enum(['row', 'column', 'row-reverse', 'column-reverse']).optional(),
    gap: z.enum(['none', 'xs', 'sm', 'md', 'lg', 'xl', '2xl']).optional(),
    align: z.enum(['start', 'center', 'end', 'stretch', 'baseline']).optional(),
    justify: z.enum(['start', 'center', 'end', 'between', 'around', 'evenly']).optional(),
    wrap: z.boolean().optional(),
    inline: z.boolean().optional(),
    className: z.string().optional(),
});

export const StackSchema = z.object({
    direction: z.enum(['row', 'column', 'row-reverse', 'column-reverse']).optional(),
    gap: z.enum(['none', 'xs', 'sm', 'md', 'lg', 'xl', '2xl']).optional(),
    align: z.enum(['start', 'center', 'end', 'stretch', 'baseline']).optional(),
    justify: z.enum(['start', 'center', 'end', 'between', 'around', 'evenly']).optional(),
    wrap: z.boolean().optional(),
    className: z.string().optional(),
});

export const TableSchema = z.object({
    variant: z.enum(['simple', 'striped', 'bordered', 'unstyled']).optional(),
    size: z.enum(['sm', 'md', 'lg']).optional(),
    stickyHeader: z.boolean().optional(),
    sortable: z.boolean().optional(),
    selectable: z.boolean().optional(),
    className: z.string().optional(),
});

// ── Full component registry ────────────────────────────────────────────────────

export const ComponentSchemas = {
    // Form
    Button: ButtonSchema,
    Input: InputSchema,
    Textarea: TextareaSchema,
    Checkbox: CheckboxSchema,
    RadioGroup: RadioGroupSchema,
    Select: SelectSchema,
    Switch: SwitchSchema,
    // Display
    Badge: BadgeSchema,
    Alert: AlertSchema,
    Avatar: AvatarSchema,
    Card: CardSchema,
    Heading: HeadingSchema,
    Text: TextSchema,
    Icon: IconSchema,
    Progress: ProgressSchema,
    Spinner: SpinnerSchema,
    Separator: SeparatorSchema,
    // Navigation
    Tabs: TabsSchema,
    Accordion: AccordionSchema,
    DropdownMenu: DropdownMenuSchema,
    Tooltip: TooltipSchema,
    // Overlay
    Modal: ModalSchema,
    // Layout
    Box: BoxSchema,
    Flex: FlexSchema,
    Stack: StackSchema,
    Table: TableSchema,
} as const;

export type ComponentName = keyof typeof ComponentSchemas;
