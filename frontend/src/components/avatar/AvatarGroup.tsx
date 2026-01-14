import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Avatar, AvatarProps } from "./Avatar"

const avatarGroupVariants = cva(
  "flex items-center",
  {
    variants: {
      spacing: {
        none: "-space-x-0",
        xs: "-space-x-1",
        sm: "-space-x-2",
        md: "-space-x-3",
        lg: "-space-x-4",
        xl: "-space-x-6",
      },
    },
    defaultVariants: {
      spacing: "md",
    },
  }
)

export interface AvatarGroupProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarGroupVariants> {
  avatars: AvatarProps[]
  max?: number
  showMore?: boolean
}

const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ className, spacing, avatars, max, showMore = true, ...props }, ref) => {
    const displayedAvatars = max ? avatars.slice(0, max) : avatars
    const remainingCount = max && avatars.length > max ? avatars.length - max : 0

    return (
      <div
        ref={ref}
        className={cn(avatarGroupVariants({ spacing }), className)}
        {...props}
      >
        {displayedAvatars.map((avatarProps, index) => (
          <Avatar
            key={index}
            {...avatarProps}
            className={cn("ring-2 ring-background", avatarProps.className)}
          />
        ))}
        {remainingCount > 0 && showMore && (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-medium ring-2 ring-background">
            +{remainingCount}
          </div>
        )}
      </div>
    )
  }
)
AvatarGroup.displayName = "AvatarGroup"

export { AvatarGroup, avatarGroupVariants }

