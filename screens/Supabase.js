import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, Dimensions, ScrollView } from 'react-native';


import { supabase } from './supabaseClient';
const w = Dimensions.get("window").width;
const h = Dimensions.get("window").height;

const Supabase = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase.from('users').select('*');

            if (error) throw error;

            setUsers(data);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text>Error: {error}</Text>
            </View>
        );
    }

    return (
            <FlatList style={{height:50}}
                data={users}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <View style={styles.userItem}>
                        <Text style={[styles.userText, {fontSize:w>600?80:50}]}>ID: {item.id}</Text>
                        <Text style={styles.userText}>Username: {item.username}</Text>
                        <Text style={styles.userText}>Email: {item.email}</Text>
                        <Text style={styles.userText}>Password: {item.password}</Text>
                        <Text style={styles.userText}>Created At: {item.created_at}</Text>

                    </View>
                )}
                nestedScrollEnabled={true} // Add this prop if nested
                contentContainerStyle={{ paddingBottom: 20 }} // Example padding

            />
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
        height: 100
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    userItem: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
    userText: {
        fontSize: 16,
    },
});

export default Supabase;