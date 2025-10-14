import { Spinner } from 'tamagui';

interface ILoading {
    isLoading: boolean;
    size?: "large" | "small";
}

export default function Loading({
    isLoading,
    size = 'large'
}: ILoading) {
    if (!isLoading) {
        return null;
    }
    return (
        <div className='absolute loading-wrapper'>
            <Spinner size={size} color="$green10" />
        </div>
    )
}