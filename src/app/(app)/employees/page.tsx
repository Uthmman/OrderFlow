
'use client';

import React, { useState } from 'react';
import { useEmployees } from '@/hooks/use-employees';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
    Loader2, 
    Search, 
    Users, 
    Phone, 
    Calendar,
    Briefcase,
    CreditCard,
    Copy,
    Check
} from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';

export default function EmployeesPage() {
    const { employees, loading } = useEmployees();
    const { role, loading: userLoading } = useUser();
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const filteredEmployees = employees.filter(emp => 
        emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.position?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCopyAccount = (acc: string, id: string) => {
        if (!acc) return;
        navigator.clipboard.writeText(acc);
        setCopiedId(id);
        toast({ title: "Account Copied", description: "Account number copied to clipboard." });
        setTimeout(() => setCopiedId(null), 2000);
    };

    if (loading || userLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Verifying Authorization...</p>
            </div>
        );
    }

    if (role !== 'Admin' && role !== 'Manager') {
        return (
             <Card className="max-w-md mx-auto mt-12">
                <CardHeader>
                    <CardTitle>Access Denied</CardTitle>
                    <CardDescription>You do not have permission to view the employee directory.</CardDescription>
                </CardHeader>
                 <CardContent>
                    <p className="text-sm text-muted-foreground">This section is restricted to Admin and Management personnel. Please contact your administrator if you believe this is an error.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
                <div>
                    <h1 className="text-3xl font-bold font-headline tracking-tight">Team Directory</h1>
                    <p className="text-muted-foreground text-sm">Zenbaba Furniture workshop personnel.</p>
                </div>
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search team member..." 
                        className="pl-10 h-10"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEmployees.length === 0 ? (
                    <div className="col-span-full py-20 text-center border-2 border-dashed rounded-2xl bg-muted/5">
                        <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-10" />
                        <p className="text-sm font-bold text-muted-foreground">No personnel found matching your search.</p>
                    </div>
                ) : filteredEmployees.map(employee => {
                    const isInactive = employee.status === 'Inactive';
                    const payRate = employee.paymentMethod === 'Monthly' ? employee.monthlyRate : employee.dailyRate;

                    return (
                        <Card key={employee.id} className={cn(
                            "overflow-hidden group transition-all border-none shadow-md bg-white relative",
                            isInactive && "opacity-60 grayscale-[0.8] scale-[0.98]"
                        )}>
                            <CardHeader className="bg-muted/30 pb-4 border-b">
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-14 w-14 border-2 border-white shadow-sm">
                                        <AvatarImage src={employee.avatarUrl} />
                                        <AvatarFallback className="font-bold text-primary bg-white">
                                            {employee.name?.split(' ').map(n => n[0]).join('')}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <CardTitle className="text-base font-bold truncate">{employee.name}</CardTitle>
                                            <Badge variant={isInactive ? "destructive" : "default"} className="h-5 px-1.5 text-[8px] font-black uppercase tracking-tighter shrink-0">
                                                {employee.status}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <Briefcase className="h-3 w-3 text-muted-foreground" />
                                            <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">{employee.position}</p>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Classification</p>
                                        <Badge variant="outline" className="h-6 px-2 text-[10px] font-bold bg-slate-50 border-slate-200">
                                            {employee.paymentMethod || 'Daily'} Basis
                                        </Badge>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Current Rate</p>
                                        <p className="text-xs font-black text-primary">{formatCurrency(payRate || 0)}</p>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-2 border-t border-slate-50">
                                    {employee.phone && (
                                        <div className="flex items-center justify-between group/info">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-primary/5 flex items-center justify-center text-primary">
                                                    <Phone className="h-3.5 w-3.5" />
                                                </div>
                                                <span className="text-sm font-medium text-slate-600">{employee.phone}</span>
                                            </div>
                                            <Button size="sm" variant="ghost" className="h-8 px-3 rounded-lg hover:bg-primary hover:text-white" asChild>
                                                <a href={`tel:${employee.phone}`}>Call</a>
                                            </Button>
                                        </div>
                                    )}

                                    {employee.accountNumber && (
                                        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 group/acc">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <CreditCard className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest leading-none mb-0.5">Account Number</p>
                                                    <p className="text-xs font-bold text-slate-700 truncate">{employee.accountNumber}</p>
                                                </div>
                                            </div>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-7 w-7 shrink-0 hover:bg-white shadow-sm" 
                                                onClick={() => handleCopyAccount(employee.accountNumber!, employee.id)}
                                            >
                                                {copiedId === employee.id ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                                            </Button>
                                        </div>
                                    )}

                                    {employee.attendanceStartDate && (
                                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium pt-1">
                                            <Calendar className="h-3 w-3 opacity-40" />
                                            Joined {employee.attendanceStartDate}
                                        </div>
                                    )}

                                    {isInactive && employee.inactiveDate && (
                                        <div className="p-2 rounded-lg bg-red-50 border border-red-100 flex items-center gap-2">
                                            <Calendar className="h-3 w-3 text-red-400" />
                                            <p className="text-[10px] font-bold text-red-600 uppercase tracking-tight">Left on {employee.inactiveDate}</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
