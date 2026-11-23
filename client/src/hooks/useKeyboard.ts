import { useState, useEffect, useRef } from 'react';
import { Keyboard, KeyboardEvent, Platform, Animated } from 'react-native';

export function useKeyboard() {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const keyboardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e?: KeyboardEvent) => {
      const height = e?.endCoordinates?.height || 0;
      setKeyboardVisible(true);
      setKeyboardHeight(height);

      Animated.timing(keyboardAnim, {
        toValue: height,
        duration: Platform.OS === 'ios' ? (e?.duration || 250) : 200,
        useNativeDriver: false,
      }).start();
    };

    const onHide = (e?: KeyboardEvent) => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);

      Animated.timing(keyboardAnim, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? (e?.duration || 250) : 200,
        useNativeDriver: false,
      }).start();
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardAnim]);

  return {
    keyboardVisible,
    keyboardHeight,
    keyboardAnim,
    dismissKeyboard: Keyboard.dismiss,
  };
}

