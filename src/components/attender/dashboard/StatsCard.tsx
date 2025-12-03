import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import * as Icons from 'lucide-react';

interface StatsCardProps {
    icon: keyof typeof Icons;
    label: string;
    value: string | number;
    trend?: {
        value: string;
        isPositive: boolean;
    };
    iconColor?: string;
    iconBgColor?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
    icon,
    label,
    value,
    trend,
    iconColor = "text-primary",
    iconBgColor = "bg-primary/10"
}) => {
    const IconComponent = Icons[icon] as React.ComponentType<{ className?: string }>;

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                            {label}
                        </p>
                        <h3 className="text-3xl font-bold">
                            {value}
                        </h3>
                        {trend && (
                            <p className={`text-xs mt-2 flex items-center gap-1 ${trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
                                }`}>
                                {trend.isPositive ? (
                                    <Icons.TrendingUp className="h-3 w-3" />
                                ) : (
                                    <Icons.TrendingDown className="h-3 w-3" />
                                )}
                                {trend.value}
                            </p>
                        )}
                    </div>
                    <div className={`p-3 rounded-xl ${iconBgColor}`}>
                        <IconComponent className={`h-6 w-6 ${iconColor}`} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};