import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogFooter,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth, updateUserAndRoute } from "@/lib/auth";

const appCreateSchema = z.object({
	name: z.string().min(2, "App name must be at least 2 characters"),
	description: z.string().optional(),
});

interface NewAppDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export default function NewAppDialog({ open, onOpenChange }: NewAppDialogProps) {
	const { toast } = useToast();
	const { user } = useAuth();

	const form = useForm<z.infer<typeof appCreateSchema>>({
		resolver: zodResolver(appCreateSchema),
		defaultValues: { name: "", description: "" },
	});

	const createAppMutation = useMutation({
		mutationFn: async (data: z.infer<typeof appCreateSchema>) => {
			const response = await apiRequest("POST", "/api/auth/apps", data);
			return response.json();
		},
		onSuccess: async (data) => {
			toast({ title: "App created!", description: "Your app has been created successfully." });
			onOpenChange(false);
			if (user) {
				const updatedUser = { ...user, has_apps: true };
				const newTokens = { access_token: data.access_token, refresh_token: data.refresh_token };
				await updateUserAndRoute(updatedUser, newTokens, data.app.id);
			}
		},
		onError: (error: any) => {
			toast({ title: "Failed to create app", description: error.message, variant: "destructive" });
		},
	});

	const onSubmit = (data: z.infer<typeof appCreateSchema>) => {
		createAppMutation.mutate(data);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create New App</DialogTitle>
					<DialogDescription>Enter your app's details to get started</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Name</FormLabel>
									<FormControl>
										<Input placeholder="e.g. Dragon Quest Mobile" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Description (optional)</FormLabel>
									<FormControl>
										<Textarea placeholder="Brief description..." rows={3} {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<DialogFooter>
											<Button type="submit" disabled={createAppMutation.isPending}>
												{createAppMutation.isPending ? "Creating..." : "Create App"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
