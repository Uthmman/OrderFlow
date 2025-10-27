
"use client";

import { use } from "react";
import { notFound, useRouter } from "next/navigation";
import { useCustomers } from "@/hooks/use-customers";
import { useOrders } from "@/hooks/use-orders";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, MapPin, MessageSquare, Star, Edit, MoreVertical, Building, User, Users, ExternalLink } from "lucide-react";
import { OrderTable } from "@/components/app/order-table";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`h-5 w-5 ${
            i < rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
          }`}
        />
      ))}
    </div>
  );
}

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const { id } = use(params);
  const { getCustomerById, loading: customersLoading } = useCustomers();
  const { orders, loading: ordersLoading } = useOrders();

  const customer = getCustomerById(id);

  if (customersLoading || ordersLoading) {
    return <div>Loading...</div>;
  }

  if (!customer) {
    notFound();
  }
  
  const customerOrders = orders.filter(order => customer.orderIds.includes(order.id));
  const totalSpent = customerOrders.reduce((acc, order) => acc + order.incomeAmount, 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 border-2 border-primary">
            <AvatarImage src={customer.avatarUrl} />
            <AvatarFallback className="text-3xl">
              {customer.name.split(" ").map(n => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight">{customer.name}</h1>
            {customer.company && (
              <p className="text-muted-foreground flex items-center gap-2">
                  <Building className="h-4 w-4" /> {customer.company}
              </p>
            )}
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
                <User className="h-4 w-4" /> {customer.gender}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline">
                <Edit className="mr-2" /> Edit
            </Button>
            <Button variant="ghost" size="icon">
                <MoreVertical />
            </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                    {customer.email && (
                        <div className="flex items-start gap-3">
                                <Mail className="h-4 w-4 text-muted-foreground mt-1" />
                                <div>
                                    <p className="font-medium">Email</p>
                                    <a href={`mailto:${customer.email}`} className="text-primary hover:underline">{customer.email}</a>
                                </div>
                        </div>
                    )}
                   <div className="flex items-start gap-3">
                        <Phone className="h-4 w-4 text-muted-foreground mt-1" />
                        <div>
                            <p className="font-medium">Phone Numbers</p>
                            {customer.phoneNumbers?.map(p => (
                                <p key={p.number} className="text-muted-foreground">{p.type}: {p.number}</p>
                            ))}
                        </div>
                   </div>
                   {customer.telegram && (
                    <div className="flex items-start gap-3">
                        <MessageSquare className="h-4 w-4 text-muted-foreground mt-1" />
                        <div>
                            <p className="font-medium">Telegram</p>
                            <p className="text-muted-foreground">{customer.telegram}</p>
                        </div>
                   </div>
                   )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Location</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <p>{customer.location.town}</p>
                    </div>
                    {customer.location.mapUrl && (
                        <Button asChild variant="outline" className="w-full">
                            <Link href={customer.location.mapUrl} target="_blank">
                                <ExternalLink className="mr-2" /> View on Map
                            </Link>
                        </Button>
                    )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Customer Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Orders</span>
                        <span className="font-bold">{customer.orderIds.length}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Spent</span>
                        <span className="font-bold">${totalSpent.toLocaleString()}</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Reviews</span>
                        <span className="font-bold">{customer.reviews.length}</span>
                    </div>
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-2 space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Past Orders</CardTitle>
                    <CardDescription>A history of all orders placed by {customer.name}.</CardDescription>
                </CardHeader>
                <CardContent>
                    <OrderTable orders={customerOrders} />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Customer Reviews</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {customer.reviews.length > 0 ? customer.reviews.map(review => (
                        <div key={review.id}>
                            <div className="flex justify-between items-center mb-2">
                                <StarRating rating={review.rating} />
                                <span className="text-xs text-muted-foreground">{new Date(review.date).toLocaleDateString()}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{review.comment}</p>
                        </div>
                    )) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No reviews yet.</p>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
