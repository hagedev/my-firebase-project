'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth, useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import type { Tenant, Table as TableType } from '@/lib/types';
import { Loader2, CheckCircle, XCircle, ShieldQuestion, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FirebaseError } from 'firebase/app';

// State machine for page flow
type PageStatus = 'authenticating' | 'welcome' | 'testing' | 'test_complete' | 'error';
type TestStep = {
    id: 'tenant' | 'table' | 'menu' | 'order';
    description: string;
    status: 'pending' | 'running' | 'success' | 'failed';
    error?: string;
};

const INITIAL_TEST_STEPS: TestStep[] = [
    { id: 'tenant', description: 'Uji 1: Membaca Info Kafe (tenants)', status: 'pending' },
    { id: 'table', description: 'Uji 2: Membaca Info Meja (tables)', status: 'pending' },
    { id: 'menu', description: 'Uji 3: Membaca Daftar Menu (menus)', status: 'pending' },
    { id: 'order', description: 'Uji 4: Membuat Pesanan Baru (orders)', status: 'pending' },
];

export default function OrderPage() {
  const params = useParams();
  const { slug, tableId } = params as { slug: string, tableId: string };
  
  const auth = useAuth();
  const firestore = useFirestore();

  const [pageStatus, setPageStatus] = useState<PageStatus>('authenticating');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [testSteps, setTestSteps] = useState<TestStep[]>(INITIAL_TEST_STEPS);
  
  // STEP 1: Handle Anonymous Authentication
  useEffect(() => {
    if (!auth) {
      if (pageStatus !== 'error') {
        setErrorMsg('Layanan autentikasi tidak siap.');
        setPageStatus('error');
      }
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setPageStatus('welcome'); // Autentikasi sukses, siap untuk testing
      } else {
        signInAnonymously(auth).catch((error) => {
          console.error("Anonymous sign-in error:", error);
          setErrorMsg('Gagal memulai sesi. Coba refresh halaman.');
          setPageStatus('error');
        });
      }
    });
    return () => unsubscribe();
  }, [auth]);

  const updateTestStep = (id: TestStep['id'], status: TestStep['status'], error?: string) => {
    setTestSteps(prev => prev.map(step => 
        step.id === id ? { ...step, status, error } : step
    ));
    if (status === 'failed') {
      setErrorMsg(error || `Kegagalan pada ${id}`);
      setPageStatus('error');
    }
  };

  const handleFailure = (stepId: TestStep['id'], error: any, path: string, operation: 'get' | 'list' | 'create', requestData?: any) => {
    console.error(`Test error on step ${stepId}:`, error);
    if (error instanceof FirebaseError && error.code === 'permission-denied') {
        const contextualError = new FirestorePermissionError({
            operation: operation,
            path: path,
            requestResourceData: requestData,
        });
        errorEmitter.emit('permission-error', contextualError);
    } else {
        updateTestStep(stepId, 'failed', error.message);
    }
  };

  // STEP 2 & 3: Handle button click and run test sequence
  const handleStartOrderTest = async () => {
    setPageStatus('testing');
    setTestSteps(INITIAL_TEST_STEPS);

    if (!firestore || !auth?.currentUser) {
        setErrorMsg('Sesi autentikasi tidak valid atau Firestore tidak siap. Silakan refresh halaman.');
        setPageStatus('error');
        return;
    }

    let tenant: Tenant | null = null;
    
    // --- TEST 1: Fetch Tenant Info ---
    updateTestStep('tenant', 'running');
    const tenantQuery = query(collection(firestore, 'tenants'), where('slug', '==', slug));
    const tenantSnapshot = await getDocs(tenantQuery).catch(err => {
        handleFailure('tenant', err, 'tenants', 'list');
        return null;
    });

    if (!tenantSnapshot) return; // Stop if failed

    if (tenantSnapshot.empty) {
        updateTestStep('tenant', 'failed', `Kafe dengan slug "${slug}" tidak ditemukan.`);
        return;
    }
    tenant = { id: tenantSnapshot.docs[0].id, ...tenantSnapshot.docs[0].data() } as Tenant;
    updateTestStep('tenant', 'success');

    // --- TEST 2: Fetch Table Info ---
    updateTestStep('table', 'running');
    const tableRef = doc(firestore, `tenants/${tenant.id}/tables/${tableId}`);
    const tableSnap = await getDoc(tableRef).catch(err => {
        handleFailure('table', err, tableRef.path, 'get');
        return null;
    });

    if (!tableSnap) return; // Stop if failed

    if (!tableSnap.exists()) {
        updateTestStep('table', 'failed', `Meja dengan ID "${tableId}" tidak ditemukan.`);
        return;
    }
    updateTestStep('table', 'success');
      
    // --- TEST 3: Fetch Menu Items ---
    updateTestStep('menu', 'running');
    const menuRef = collection(firestore, `tenants/${tenant.id}/menus`);
    const menuSnap = await getDocs(menuRef).catch(err => {
        handleFailure('menu', err, menuRef.path, 'list');
        return null;
    });
    
    if (!menuSnap) return; // Stop if failed
    updateTestStep('menu', 'success');

    // --- TEST 4: Create a dummy Order ---
    updateTestStep('order', 'running');
    const ordersRef = collection(firestore, `tenants/${tenant.id}/orders`);
    const dummyOrderData = {
        tenantId: tenant.id,
        tableId: tableId,
        verificationToken: tenant.tokenHarian, // Use the correct token
        createdAt: serverTimestamp(),
        status: 'cancelled', // Mark as cancelled so it doesn't affect real data
    };
    
    const orderDoc = await addDoc(ordersRef, dummyOrderData).catch(err => {
        handleFailure('order', err, ordersRef.path, 'create', dummyOrderData);
        return null;
    });

    if (!orderDoc) return; // Stop if failed
    updateTestStep('order', 'success');

    setPageStatus('test_complete');
  };

  const TestResultIcon = ({ status }: { status: TestStep['status'] }) => {
    switch (status) {
        case 'pending': return <ShieldQuestion className="text-muted-foreground" />;
        case 'running': return <Loader2 className="animate-spin text-blue-500" />;
        case 'success': return <CheckCircle className="text-green-500" />;
        case 'failed': return <XCircle className="text-destructive" />;
        default: return null;
    }
  };


  // --- Render Logic ---
  const renderContent = () => {
    switch (pageStatus) {
      case 'authenticating':
        return (
          <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-center p-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-lg text-muted-foreground">Mempersiapkan sesi...</p>
          </div>
        );

      case 'welcome':
        return (
          <main className="flex-1 flex flex-col items-center justify-center p-4">
            <div className="container mx-auto flex flex-col items-center gap-6 text-center">
                <h1 className="font-headline text-5xl md:text-7xl font-bold drop-shadow-lg">
                    Selamat Datang
                </h1>
                <p className="text-muted-foreground">Klik tombol di bawah untuk memulai tes akses data.</p>
                <Button size="lg" className="mt-4" onClick={handleStartOrderTest}>
                    <Play className="mr-2"/>
                    Mulai Uji
                </Button>
            </div>
          </main>
        );

      case 'testing':
      case 'test_complete':
      case 'error':
         return (
          <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Hasil Pengujian Akses</CardTitle>
                    <CardDescription>
                       {pageStatus === 'testing' && 'Pengujian sedang berjalan...'}
                       {pageStatus === 'test_complete' && 'Semua pengujian berhasil!'}
                       {pageStatus === 'error' && 'Pengujian gagal pada salah satu langkah.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-4">
                        {testSteps.map(step => (
                            <li key={step.id} className="flex items-start gap-4">
                                <TestResultIcon status={step.status} />
                                <div className="text-left">
                                    <p className="font-medium">{step.description}</p>
                                    {step.status === 'failed' && (
                                        <p className="text-xs text-destructive">{step.error}</p>
                                    )}
                                    {step.status === 'success' && (
                                        <p className="text-xs text-green-600">SUKSES</p>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                    {pageStatus === 'test_complete' && (
                        <div className="mt-6 p-4 bg-green-50 text-green-800 rounded-md border border-green-200">
                           <p className="font-bold text-center">Semua pengujian berhasil!</p>
                        </div>
                    )}
                     {pageStatus === 'error' && errorMsg && (
                        <div className="mt-6 p-4 bg-red-50 text-red-800 rounded-md border border-red-200">
                           <p className="font-bold text-center">Pengujian Gagal!</p>
                           <p className="text-sm text-center mt-1">{errorMsg}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
          </div>
        );
      
      default:
        return null;
    }
  };

  return <>{renderContent()}</>;
}
