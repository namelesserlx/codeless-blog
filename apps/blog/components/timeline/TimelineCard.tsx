import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TimelineCardProps {
    title: string;
    date?: string;
    description: string;
    status?: string;
    statusVariant?: 'default' | 'secondary' | 'outline' | 'destructive';
    statusClassName?: string;
    className?: string;
}

export function TimelineCard({
    title,
    date,
    description,
    status,
    statusVariant = 'secondary',
    statusClassName = '',
    className = '',
}: TimelineCardProps) {
    return (
        <Card className={`overflow-hidden border-none shadow-md ${className}`}>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-medium">{title}</CardTitle>
                    {date && !status && (
                        <Badge variant={statusVariant} className="text-xs">
                            {date}
                        </Badge>
                    )}
                    {status && (
                        <Badge
                            variant={statusVariant === 'outline' ? 'outline' : statusVariant}
                            className={`text-xs ${statusClassName}`}
                        >
                            {status}
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="pb-4">
                <p className="text-sm text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    );
}
