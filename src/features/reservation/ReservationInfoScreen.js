import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, RefreshControl, Alert} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import NoAuthScreen from '../../components/common/NotAuthScreen';
import CustomAlert from '../../components/common/CustomAlert';

const ReservationItem = ({ 
  tipo_de_servicio, 
  hora_seleccionada, 
  fecha, 
  estado, 
  comentarios,
  comentariosnego,
  id_negocio,
  id,
  onCancel, 
  onViewDetails 
}) => {
  const getStatusInfo = (status) => {
    switch(status.toLowerCase()) {
      case 'pendiente':
        return {
          icon: 'time',
          color: '#848483',
          text: 'Pendiente',
          bgColor: '#dddbd8'
        };
      case 'aceptado':
        return {
          icon: 'checkmark-circle',
          color: '#4CAF50',
          text: 'Aprobado',
          bgColor: '#E8F5E9'
        };
      case 'rechazado':
        return {
          icon: 'close-circle',
          color: '#F44336',
          text: 'Rechazado',
          bgColor: '#FFEBEE'
        };
      case 'cancelado':
        return {
          icon: 'close-circle-outline',
          color: '#bf1e13',
          text: 'Cancelado',
          bgColor: '#FFEBEE'
        };
      case 'concluido':
        return {
          icon: 'checkmark',
          color: '#f9f9f6',
          text: 'Concluido',
          bgColor: '#e1d54f'
        }
      default:
        return {
          icon: 'help-circle-outline',
          color: '#9E9E9E',
          text: status,
          bgColor: '#F5F5F5'
        };
    }
  };

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), "dd 'de' MMMM, yyyy", { locale: es });
    } catch (e) {
      return dateString;
    }
  };

  const statusInfo = getStatusInfo(estado);

  return (
    <TouchableOpacity 
      style={styles.itemContainer}
      onPress={onViewDetails}
      activeOpacity={0.7}
    >
      <View style={styles.itemHeader}>
        <Ionicons name={statusInfo.icon} size={24} color={statusInfo.color} />
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
          <Text style={[styles.statusText, { color: statusInfo.color }]}>
            {statusInfo.text}
          </Text>
        </View>
      </View>

      <View style={styles.itemContent}>
        <Text style={styles.serviceName}>{tipo_de_servicio}</Text>
        <View style={styles.dateTimeContainer}>
          <View style={styles.timeInfo}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.dateTimeText}>{hora_seleccionada}</Text>
          </View>
          <View style={styles.dateInfo}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.dateTimeText}>{formatDate(fecha)}</Text>
          </View>
        </View>

        {comentariosnego && (
          <View style={styles.commentsContainer}>
            <Text style={styles.commentsTitle}>Comentarios del negocio:</Text>
            <Text style={styles.commentsText}>{comentariosnego}</Text>
          </View>
        )}

        {estado === 'pendiente' && (
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => onCancel(id)}
          >
            <Ionicons name="close-outline" size={20} color="#F44336" />
            <Text style={styles.cancelButtonText}>Cancelar reservación</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={styles.detailsButton}
          onPress={onViewDetails}
        >
          <Ionicons name="information-circle-outline" size={20} color="#2196F3" />
          <Text style={styles.detailsButtonText}>Ver detalles</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const ReservationsScreen = ({ navigation }) => {
  const [alertConfig, setAlertConfig] = useState({
    isVisible: false,
    type: 'info',
    title: '',
    message: '',
    buttons: []
  });
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  
  const fetchReservations = async () => {
    if (!user?.uid) return;
    
    try {
      setError(null);
      const response = await fetch(
        `https://www.jaydey.com/ServicesMovil/api/user-reservations/${user.uid}`,
        {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }
      );
      
      const data = await response.json();
      
      if (data.success) {
        const sortedReservations = data.reservations.sort((a, b) => 
          new Date(b.fecha_creacion) - new Date(a.fecha_creacion)
        );
        setReservations(sortedReservations);
      } else {
        setError('No se pudieron cargar las reservaciones');
      }
    } catch (err) {
      setError('Error al conectar con el servidor');
      console.error('Error fetching reservations:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchReservations();
  }, []);

  useEffect(() => {
    if (user?.uid) {
      fetchReservations();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleCancelReservation = async (reservationId) => {
    setAlertConfig({
      isVisible: true,
      type: 'error',
      title: 'Cancelar Reservación',
      message: '¿Estás seguro que deseas cancelar esta reservación?',
      buttons: [
        {
          text: 'No',
          color: '#666',
          onPress: () => setAlertConfig(prev => ({ ...prev, isVisible: false }))
        },
        {
          text: 'Sí, cancelar',
          color: '#F44336',
          onPress: async () => {
            try {
              const response = await fetch(
                `https://www.jaydey.com/ServicesMovil/api/cancel-reservation/${reservationId}`,
                {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    userId: user.uid,
                    token: user.id_token
                  })
                }
              );
  
              const data = await response.json();
              
              if (data.success) {
                setAlertConfig({
                  isVisible: true,
                  type: 'success',
                  title: 'Éxito',
                  message: 'La reservación ha sido cancelada correctamente',
                  buttons: [
                    {
                      text: 'OK',
                      onPress: () => {
                        fetchReservations();
                        setAlertConfig(prev => ({ ...prev, isVisible: false }));
                      }
                    }
                  ]
                });
              } else {
                setAlertConfig({
                  isVisible: true,
                  type: 'error',
                  title: 'Error',
                  message: data.message || 'No se pudo cancelar la reservación',
                  buttons: [
                    {
                      text: 'OK',
                      onPress: () => setAlertConfig(prev => ({ ...prev, isVisible: false }))
                    }
                  ]
                });
              }
            } catch (error) {
              console.error('Error al cancelar la reservación:', error);
              setAlertConfig({
                isVisible: true,
                type: 'error',
                title: 'Error',
                message: 'Hubo un problema al cancelar la reservación. Por favor, intenta de nuevo.',
                buttons: [
                  {
                    text: 'OK',
                    onPress: () => setAlertConfig(prev => ({ ...prev, isVisible: false }))
                  }
                ]
              });
            }
          }
        }
      ]
    });
  };

  if (!user?.uid) {
    return <NoAuthScreen navigation={navigation} />;
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#F44336" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={fetchReservations}
        >
          <Text style={styles.retryButtonText}>Intentar de nuevo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (reservations.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="calendar-outline" size={48} color="#666" />
        <Text style={styles.noReservationsText}>No tienes reservaciones activas</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={fetchReservations}
        >
          <Ionicons name="refresh-outline" size={20} color="#FFF" />
          <Text style={styles.refreshButtonText}>Actualizar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis Reservaciones</Text>
      </View>
      <FlatList
        data={reservations}
        renderItem={({ item }) => (
          <ReservationItem 
            {...item}
            onCancel={handleCancelReservation}
            onViewDetails={() => navigation.navigate('Detalles', { reservation: item })}
          />
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#000"]}
            tintColor="#000"
          />
        }
      />
       <CustomAlert
        isVisible={alertConfig.isVisible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig(prev => ({ ...prev, isVisible: false }))}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  listContainer: {
    padding: 16,
  },
  itemContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  itemContent: {
    padding: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateTimeText: {
    color: '#666',
    fontSize: 14,
  },
  commentsContainer: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  commentsTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  commentsText: {
    color: '#666',
    fontSize: 14,
    lineHeight: 20,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F44336',
    borderRadius: 8,
    gap: 8,
  },
  cancelButtonText: {
    color: '#F44336',
    fontSize: 14,
    fontWeight: '500',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    gap: 8,
    borderColor: '#2196F3',
    borderWidth: 1,
  },
  detailsButtonText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '500',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FAFAFA',
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
    marginVertical: 16,
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: '#1A1A1A',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  noReservationsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: '#1A1A1A',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  refreshButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
});
export default ReservationsScreen;