import { useEffect, useRef, useState } from 'preact/hooks';

export const useMountEffect = (fun: any) => useEffect(fun, [])

export const useEffectOnce = (effect: () => void | (() => void)) => {
  const destroyFunc = useRef<void | (() => void)>(null);
  const effectCalled = useRef(false);
  const renderAfterCalled = useRef(false);
  const [val, setVal] = useState<number>(0);

  if (effectCalled.current) {
    renderAfterCalled.current = true;
  }

  useEffect(() => {
    // only execute the effect first time around
    if (!effectCalled.current) {
      destroyFunc.current = effect();
      effectCalled.current = true;
    }

    // this forces one render after the effect is run
    setVal((val) => val + 1);

    return () => {
      // if the comp didn't render since the useEffect was called,
      // we know it's the dummy React cycle
      if (!renderAfterCalled.current) {
        return;
      }
      if (destroyFunc.current) {
        destroyFunc.current();
      }
    };
  }, []);
};


function getStorageValue(key: string, defaultValue: any) {
  // getting stored value
  const saved = localStorage.getItem(key);
  const initial = JSON.parse(saved as string);
  return initial || defaultValue;
}

export const useLocalStorage = (key: string, defaultValue: any) => {
  const [value, setValue] = useState(() => {
    return getStorageValue(key, defaultValue);
  });

  useEffect(() => {
    // storing input name
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
};

export function useComponentVisible(initialIsVisible: boolean) {
  const [isOpen, setIsOpen] = useState(initialIsVisible);
  const ref = useRef(null);

  const handleClickOutside = (event: any) => {
    // @ts-ignore
    if (ref.current && !ref.current.contains(event.target)) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('click', handleClickOutside, true);
    return () => {
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, []);


  return { ref, isOpen, setIsOpen };
}
