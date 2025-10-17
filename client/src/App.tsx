import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Profile from "@/pages/Profile";
import VRMode from "@/pages/VRMode";
import Privacy from "@/pages/Privacy";
import SellerRegister from "@/pages/SellerRegister";
import SellerContents from "@/pages/SellerContents";
import DBManager from "@/pages/DBManager";
import TicketPurchase from "@/pages/TicketPurchase";

import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/profile" component={Profile} />
      <Route path="/vr/buy/:id" component={TicketPurchase} />
      <Route path="/vr/:id" component={VRMode} />
      
      <Route path="/vr" component={Home} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/seller/register" component={SellerRegister} />
      <Route path="/seller/contents" component={SellerContents} />
      <Route path="/admin/db" component={DBManager} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">
            <Router />
          </main>
          <Footer />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
