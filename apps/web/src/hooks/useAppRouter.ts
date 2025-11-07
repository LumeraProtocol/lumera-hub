import { useRouter } from 'next/navigation';

const useAppRouter = () => {
  const router = useRouter();

  const redirect = (url: string) => {
    if (!url) {
      return;
    }
    router.push(url);
  }

  return {
    redirect,
  }
}

export default useAppRouter;
