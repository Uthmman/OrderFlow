
'use client';

import React, { useState } from 'react';
import { useEmployees } from '@/hooks/use-employees';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
    Loader2, 
    Search, 
    Users, 
    Mail, 
    Phone, 
    Calendar,
    Briefcase,
    ShieldCheck
} from 'lucide-react';
import { formatTimestamp } from '@/lib/utils';

export default function EmployeesPage() {
    const { employees, loading } = useEmployees();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredEmployees = employees.filter(emp => 
        emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.role?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Fetching Staff Profiles...</p>
            </div>
        );
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
                ) : filteredEmployees.map(employee => (
                    <Card key={employee.id} className="overflow-hidden group hover:ring-2 hover:ring-primary/20 transition-all border-none shadow-md bg-white">
                        <CardHeader className="bg-muted/30 pb-4 border-b">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-14 w-14 border-2 border-white shadow-sm">
                                    <AvatarImage src={employee.avatarUrl} />
                                    <AvatarFallback className="font-bold text-primary bg-white">
                                        {employee.name?.split(' ').map(n => n[0]).join('')}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <CardTitle className="text-base font-bold truncate">{employee.name}</CardTitle>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <Briefcase className="h-3 w-3 text-muted-foreground" />
                                        <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">{employee.role}</p>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Classification</p>
                                    <Badge variant="outline" className="h-6 px-2 text-[10px] font-bold">
                                        {employee.workerType || 'Daily'} Basis
                                    </Badge>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Joined</p>
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                        <Calendar className="h-3 w-3 opacity-40" />
                                        {employee.joinedDate ? formatTimestamp(employee.joinedDate) : 'N/A'}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 pt-2 border-t border-slate-50">
                                {employee.phoneNumber && (
                                    <div className="flex items-center gap-3 group/info">
                                        <div className="h-8 w-8 rounded-full bg-primary/5 flex items-center justify-center text-primary group-hover/info:bg-primary group-hover/info:text-white transition-colors">
                                            <Phone className="h-3.5 w-3.5" />
                                        </div>
                                        <a href={`tel:${employee.phoneNumber}`} className="text-sm font-medium hover:underline text-slate-600">{employee.phoneNumber}</a>
                                    </div>
                                )}
                                {employee.email && (
                                    <div className="flex items-center gap-3 group/info">
                                        <div className="h-8 w-8 rounded-full bg-primary/5 flex items-center justify-center text-primary group-hover/info:bg-primary group-hover/info:text-white transition-colors">
                                            <Mail className="h-3.5 w-3.5" />
                                        </div>
                                        <a href={`mailto:${employee.email}`} className="text-sm font-medium hover:underline text-slate-600 truncate">{employee.email}</a>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
