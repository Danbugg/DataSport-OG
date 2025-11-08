import React from 'react';
import { View, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import ImageViewer from 'react-native-image-zoom-viewer';
import { Ionicons } from '@expo/vector-icons';

export default function ImgCompletaScreen({ route, navigation }) {
    // Obtenemos la URL de la imagen. El nombre de la variable es imageUrl.
    const { imageUrl } = route.params;

    // ImageViewer requiere un array de objetos con la propiedad 'url'.
    const images = [{ url: imageUrl }];

    return (
        <View style={styles.container}>
            <ImageViewer 
                imageUrls={images}
                enableSwipeDown={true} // Permite cerrar deslizando hacia abajo
                onSwipeDown={() => navigation.goBack()} // Cierra la vista al deslizar
                renderIndicator={() => null} // Oculta el contador de imágenes (ya que solo hay una)
                backgroundColor="black"
                saveToLocalByLongPress={false} // Deshabilitar guardar al mantener presionado (opcional)
            />
            
            {/* Botón de Cierre (para mejor UX en dispositivos modernos) */}
            <SafeAreaView style={styles.closeButtonContainer}>
                <TouchableOpacity 
                    onPress={() => navigation.goBack()}
                    style={styles.closeButton}
                >
                    <Ionicons name="close-circle" size={36} color="white" />
                </TouchableOpacity>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    closeButtonContainer: {
        position: 'absolute',
        top: 0,
        right: 0,
        zIndex: 10, // Asegura que esté sobre el ImageViewer
    },
    closeButton: {
        padding: 20, 
    }
});