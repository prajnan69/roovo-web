"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import supabase, { API_BASE_URL, fetchPayoutsByHostId } from "../../services/api";
import { Spinner } from "@/components/ui/shadcn-io/spinner";
import RoovoLoader from "../RoovoLoader";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

import { Wallet, History, CreditCard, ArrowUpRight, Clock } from "lucide-react";

const Payouts = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [host, setHost] = useState<any>(null);
  const [isMethodDrawerOpen, setIsMethodDrawerOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [upiId, setUpiId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestStatus, setRequestStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    const fetchHostAndPayouts = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: hostData } = await supabase
          .from('hosts')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
        if (hostData) {
          setHost(hostData);
          // Fix UPI JSON bug: if payout_details is JSON, extract bank_name or similar, 
          // but usually it should be a string. Based on screenshot it's a JSON string.
          let displayUpi = hostData.payout_details || "";
          try {
            if (displayUpi.startsWith('{')) {
              const parsed = JSON.parse(displayUpi);
              displayUpi = parsed.upi_id || parsed.vpa || parsed.bank_name || displayUpi;
            }
          } catch (e) {
            console.warn("Failed to parse payout_details as JSON", e);
          }
          setUpiId(displayUpi);

          try {
            const payouts = await fetchPayoutsByHostId(hostData.id);
            setTransactions(payouts || []);
          } catch (e) {
            console.error("Failed to fetch payouts", e);
          }
        }
      }
      setLoading(false);
    };
    fetchHostAndPayouts();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const response = await fetch(`${API_BASE_URL}/api/payouts`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.user.id,
          payoutMethod: 'UPI',
          payoutDetails: upiId,
        }),
      });
      if (response.ok) {
        const { host } = await response.json();
        setHost(host);
        setIsMethodDrawerOpen(false);
      }
    }
    setIsSaving(false);
  };

  const handleRequestPayout = async () => {
    if (pendingPayouts <= 0) return;

    setIsRequesting(true);
    setRequestStatus(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/payouts/request`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: session.user.id
          }),
        });

        const result = await response.json();

        if (response.ok) {
          setRequestStatus({ type: 'success', message: 'Payout request sent successfully!' });
          // Auto-hide success message after 3 seconds
          setTimeout(() => setRequestStatus(null), 3000);
        } else {
          setRequestStatus({ type: 'error', message: result.error || 'Failed to send request' });
        }
      } catch (e) {
        setRequestStatus({ type: 'error', message: 'Network error occurred' });
      }
    }
    setIsRequesting(false);
  };

  const totalEarnings = transactions
    .filter(t => t.status === 'Completed' || t.status === 'Paid')
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const pendingPayouts = transactions
    .filter(t => t.status === 'Pending')
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const requestedPayouts = transactions
    .filter(t => t.status === 'Requested')
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  return (
    <div className="relative min-h-screen bg-gray-50 text-gray-900 pb-48">
      {/* Header */}
      <div className="px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4 flex justify-between items-center">
        <div className="text-2xl font-bold text-gray-900 tracking-tight">Earnings</div>
      </div>

      <div className="p-4 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-[60vh]">
            <RoovoLoader />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Main Earnings Card */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 to-indigo-600 p-6 text-white shadow-xl">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
                <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-32 w-32 rounded-full bg-black/10 blur-2xl"></div>

                <div className="relative z-10">
                  <div className="flex items-center gap-2 text-indigo-100 mb-1">
                    <Wallet className="h-5 w-5" />
                    <span className="text-sm font-medium">Total Earnings</span>
                  </div>
                  <div className="text-4xl font-bold mb-4">
                    ₹{totalEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-indigo-200" />
                        <span className="text-sm text-indigo-100">Ready to Payout</span>
                      </div>
                      <span className="font-semibold">₹{pendingPayouts.toFixed(2)}</span>
                    </div>

                    {requestedPayouts > 0 && (
                      <div className="flex items-center justify-between bg-white/5 rounded-xl p-3 backdrop-blur-sm border border-white/5">
                        <div className="flex items-center gap-2">
                          <ArrowUpRight className="h-4 w-4 text-indigo-200" />
                          <span className="text-sm text-indigo-100">Pending Credit</span>
                        </div>
                        <span className="font-semibold text-indigo-50">₹{requestedPayouts.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  {pendingPayouts > 0 && (
                    <Button
                      onClick={handleRequestPayout}
                      disabled={isRequesting}
                      className="w-full mt-4 bg-white text-indigo-600 hover:bg-indigo-50 border-none rounded-xl font-bold h-11 transition-all shadow-sm"
                    >
                      {isRequesting ? <Spinner className="text-indigo-600" /> : "Request Payout"}
                    </Button>
                  )}

                  {requestStatus && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`mt-3 p-3 rounded-xl text-xs font-medium text-center ${requestStatus.type === 'success' ? 'bg-green-400/20 text-white' : 'bg-red-400/20 text-white'
                        }`}
                    >
                      {requestStatus.message}
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col gap-2 rounded-2xl border-gray-200 hover:bg-gray-50 hover:border-indigo-200 transition-all bg-white shadow-sm"
                  onClick={() => setIsMethodDrawerOpen(true)}
                >
                  <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <span className="font-medium text-gray-700">Payout Method</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col gap-2 rounded-2xl border-gray-200 hover:bg-gray-50 hover:border-indigo-200 transition-all bg-white shadow-sm"
                  onClick={() => setIsHistoryDrawerOpen(true)}
                >
                  <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <History className="h-5 w-5" />
                  </div>
                  <span className="font-medium text-gray-700">History</span>
                </Button>
              </div>

              {/* Recent Activity Preview */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900">Recent Activity</h3>
                  <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50" onClick={() => setIsHistoryDrawerOpen(true)}>
                    See All
                  </Button>
                </div>

                {transactions.length > 0 ? (
                  <div className="space-y-4">
                    {transactions.slice(0, 3).map((tx, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${tx.status === 'Paid' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'
                            }`}>
                            <ArrowUpRight className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{tx.listing}</p>
                            <p className="text-xs text-gray-500">{new Date(tx.date).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">+₹{Number(tx.amount).toFixed(2)}</p>
                          <p className={`text-xs font-medium ${tx.status === 'Completed' || tx.status === 'Paid' ? 'text-green-600' :
                            tx.status === 'Requested' ? 'text-indigo-600' : 'text-yellow-600'
                            }`}>
                            {tx.status === 'Pending' ? 'Ready' :
                              tx.status === 'Requested' ? 'Pending Credit' : 'Completed'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-4">No recent transactions</p>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Payout Method Drawer */}
      <Drawer open={isMethodDrawerOpen} onOpenChange={setIsMethodDrawerOpen}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-sm">
            <DrawerHeader>
              <DrawerTitle>Payout Method</DrawerTitle>
              <DrawerDescription>
                Enter your UPI ID to receive payouts directly to your bank account.
              </DrawerDescription>
            </DrawerHeader>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">UPI ID</label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="username@upi"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
              {host?.payout_method && (
                <div className="bg-green-50 text-green-700 p-3 rounded-xl text-sm flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  Currently linked: <span className="font-semibold">{(() => {
                    let d = host.payout_details;
                    try {
                      if (d && d.startsWith('{')) {
                        const p = JSON.parse(d);
                        return p.upi_id || p.vpa || p.bank_name || d;
                      }
                    } catch (e) { }
                    return d;
                  })()}</span>
                </div>
              )}
            </div>
            <DrawerFooter>
              <Button onClick={handleSave} className="w-full rounded-xl h-12 text-base" disabled={isSaving}>
                {isSaving ? <Spinner className="text-white" /> : "Save Payout Method"}
              </Button>
              <DrawerClose asChild>
                <Button variant="outline" className="w-full rounded-xl h-12 text-base">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

      {/* History Drawer */}
      <Drawer open={isHistoryDrawerOpen} onOpenChange={setIsHistoryDrawerOpen}>
        <DrawerContent className="h-[85vh]">
          <div className="mx-auto w-full max-w-md h-full flex flex-col">
            <DrawerHeader>
              <DrawerTitle>Transaction History</DrawerTitle>
              <DrawerDescription>
                All your earnings and payouts.
              </DrawerDescription>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto p-4">
              {transactions.map((tx, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-4 mb-3 bg-white border border-gray-100 rounded-2xl shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${tx.status === 'Paid' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'
                      }`}>
                      <ArrowUpRight className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{tx.listing}</p>
                      <p className="text-xs text-gray-500">{new Date(tx.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">+₹{Number(tx.amount).toFixed(2)}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tx.status === 'Completed' || tx.status === 'Paid' ? 'bg-green-100 text-green-700' :
                      tx.status === 'Requested' ? 'bg-indigo-100 text-indigo-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                      {tx.status === 'Pending' ? 'Ready to Payout' :
                        tx.status === 'Requested' ? 'Pending Credit' : 'Completed'}
                    </span>
                  </div>
                </motion.div>
              ))}
              {transactions.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <History className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No transactions yet</p>
                </div>
              )}
            </div>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="outline" className="w-full rounded-xl h-12">Close</Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default Payouts;
